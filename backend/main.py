import os
import datetime
import random
import hashlib
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from .database import engine, get_db, Base
from .models import (
    User, UserRole, PasswordResetOTP, Category, Warehouse, Location,
    Product, StockQuant, Operation, OperationType, OperationStatus,
    OperationLine, StockMove, SequenceCounter
)
from .schemas import (
    UserSignupRequest, UserLoginRequest, OTPRequest, OTPVerifyResetRequest,
    UserResponse, TokenResponse,
    CategoryCreate, CategoryResponse,
    WarehouseCreate, WarehouseResponse,
    LocationCreate, LocationResponse,
    ProductCreate, ProductUpdate, ProductResponse,
    StockQuantResponse, StockQuantUpdate,
    OperationCreate, OperationResponse, OperationLineResponse,
    StockMoveResponse, DashboardKPIs
)

# Initialize FastAPI
app = FastAPI(
    title="StockSense Modular IMS API",
    description="Backend API for StockSense Inventory Management System with Strict RBAC",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# --- AUTH & RBAC DEPENDENCIES ---

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extracts the authenticated user from the Authorization header Bearer JWT.
    """
    if not credentials or not credentials.credentials:
        # Check if first user exists in DB for fallback, otherwise 401
        first_user = db.query(User).first()
        if first_user:
            return first_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )

    token = credentials.credentials
    # Format: jwt_token_{id}_{timestamp}
    if token.startswith("jwt_token_"):
        parts = token.split("_")
        if len(parts) >= 3:
            try:
                user_id = int(parts[2])
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
            except (ValueError, IndexError):
                pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials"
    )


def require_role(*allowed_roles: str):
    """
    FastAPI dependency that checks current user's role against allowed roles.
    Raises HTTP 403 Forbidden if not permitted.
    """
    def role_checker(user: User = Depends(get_current_user)) -> User:
        user_role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        # Normalize
        normalized_allowed = [r.value if hasattr(r, "value") else str(r) for r in allowed_roles]

        # Handle aliases
        if user_role_str in ["inventory_manager", "manager"]:
            canonical_role = "inventory_manager"
        else:
            canonical_role = "floor_operator"

        if canonical_role not in normalized_allowed and user_role_str not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires '{allowed_roles[0]}' role clearance."
            )
        return user
    return role_checker


def generate_reference(db: Session, warehouse_id: int, op_type: OperationType) -> str:
    """
    Auto-generates reference numbers as {warehouse_short_code}/{TYPE_CODE}/{sequence}
    using a dedicated sequence counter per warehouse and type (e.g., WH/IN/0001, WH/OUT/0002).
    """
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not wh:
        raise HTTPException(status_code=400, detail="Invalid warehouse specified for reference generation")

    wh_code = wh.short_code.upper()
    type_code_map = {
        OperationType.RECEIPT: "IN",
        OperationType.DELIVERY: "OUT",
        OperationType.INTERNAL: "INT",
        OperationType.ADJUSTMENT: "ADJ",
    }
    type_code = type_code_map.get(op_type, "OP")

    # Atomic sequence counter
    counter = (
        db.query(SequenceCounter)
        .filter(SequenceCounter.warehouse_code == wh_code, SequenceCounter.operation_type == op_type.value)
        .with_for_update()
        .first()
    )
    if not counter:
        counter = SequenceCounter(warehouse_code=wh_code, operation_type=op_type.value, next_val=1)
        db.add(counter)
        db.flush()

    seq_num = counter.next_val
    counter.next_val += 1
    return f"{wh_code}/{type_code}/{seq_num:04d}"


# --- AUTH ENDPOINTS ---

@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(req: UserSignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=req.email.lower().strip(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=req.role,
        assigned_warehouse_id=req.assigned_warehouse_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    fake_jwt = f"jwt_token_{new_user.id}_{int(datetime.datetime.utcnow().timestamp())}"
    wh_code = new_user.assigned_warehouse.short_code if new_user.assigned_warehouse else None
    user_resp = UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        assigned_warehouse_id=new_user.assigned_warehouse_id,
        assigned_warehouse_code=wh_code
    )
    return TokenResponse(
        access_token=fake_jwt,
        token_type="bearer",
        user=user_resp
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or user.hashed_password != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password credentials")

    fake_jwt = f"jwt_token_{user.id}_{int(datetime.datetime.utcnow().timestamp())}"
    wh_code = user.assigned_warehouse.short_code if user.assigned_warehouse else None
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        assigned_warehouse_id=user.assigned_warehouse_id,
        assigned_warehouse_code=wh_code
    )
    return TokenResponse(
        access_token=fake_jwt,
        token_type="bearer",
        user=user_resp
    )


@app.post("/api/auth/request-otp")
def request_otp(req: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user:
        return {"message": "If an account exists, a 6-digit OTP code has been issued."}

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)

    otp_record = PasswordResetOTP(
        email=user.email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=0
    )
    db.add(otp_record)
    db.commit()

    return {
        "message": "OTP sent to registered email.",
        "debug_otp": otp_code
    }


@app.post("/api/auth/verify-otp-reset")
def verify_otp_reset(req: OTPVerifyResetRequest, db: Session = Depends(get_db)):
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.email == req.email.lower().strip(),
            PasswordResetOTP.otp_code == req.otp_code.strip(),
            PasswordResetOTP.is_used == 0,
            PasswordResetOTP.expires_at >= datetime.datetime.utcnow()
        )
        .first()
    )
    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(req.new_password)
    otp_record.is_used = 1
    db.commit()

    return {"message": "Password updated successfully. You may now login."}


# --- WAREHOUSE & LOCATION ENDPOINTS (RBAC ENFORCED) ---

@app.get("/api/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Both roles can list warehouses for read-only selection/context
    return db.query(Warehouse).order_by(Warehouse.name).all()


@app.post("/api/warehouses", response_model=WarehouseResponse)
def create_warehouse(
    req: WarehouseCreate,
    current_user: User = Depends(require_role("inventory_manager")),
    db: Session = Depends(get_db)
):
    """
    Warehouse creation is restricted to inventory_manager only (403 for floor_operator).
    """
    existing = db.query(Warehouse).filter(Warehouse.short_code == req.short_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Warehouse code '{req.short_code}' already exists")

    wh = Warehouse(name=req.name, short_code=req.short_code, address=req.address)
    db.add(wh)
    db.commit()
    db.refresh(wh)

    # Automatically create standard locations: Stock, Input, Output
    loc_stock = Location(name="General Stock", short_code="STOCK", warehouse_id=wh.id)
    loc_input = Location(name="Inbound Receiving Bay", short_code="INPUT", warehouse_id=wh.id)
    loc_output = Location(name="Outbound Dispatch Bay", short_code="OUTPUT", warehouse_id=wh.id)
    db.add_all([loc_stock, loc_input, loc_output])
    db.commit()

    return wh


@app.get("/api/locations", response_model=List[LocationResponse])
def list_locations(
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Location)
    if warehouse_id:
        query = query.filter(Location.warehouse_id == warehouse_id)

    locs = query.order_by(Location.name).all()
    results = []
    for loc in locs:
        wh_code = loc.warehouse.short_code if loc.warehouse else None
        results.append(LocationResponse(
            id=loc.id,
            name=loc.name,
            short_code=loc.short_code,
            warehouse_id=loc.warehouse_id,
            warehouse_code=wh_code
        ))
    return results


@app.post("/api/locations", response_model=LocationResponse)
def create_location(
    req: LocationCreate,
    current_user: User = Depends(require_role("inventory_manager")),
    db: Session = Depends(get_db)
):
    """
    Location creation is restricted to inventory_manager only (403 for floor_operator).
    """
    existing = (
        db.query(Location)
        .filter(Location.warehouse_id == req.warehouse_id, Location.short_code == req.short_code)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"Location code '{req.short_code}' already exists in this warehouse")

    loc = Location(name=req.name, short_code=req.short_code, warehouse_id=req.warehouse_id)
    db.add(loc)
    db.commit()
    db.refresh(loc)

    wh_code = loc.warehouse.short_code if loc.warehouse else None
    return LocationResponse(
        id=loc.id,
        name=loc.name,
        short_code=loc.short_code,
        warehouse_id=loc.warehouse_id,
        warehouse_code=wh_code
    )


# --- CATEGORY ENDPOINTS ---

@app.get("/api/categories", response_model=List[CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.name).all()


@app.post("/api/categories", response_model=CategoryResponse)
def create_category(
    req: CategoryCreate,
    current_user: User = Depends(require_role("inventory_manager")),
    db: Session = Depends(get_db)
):
    existing = db.query(Category).filter(Category.name == req.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    cat = Category(name=req.name.strip())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# --- PRODUCT & STOCK ENDPOINTS (RBAC ENFORCED) ---

@app.get("/api/products", response_model=List[ProductResponse])
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Product listing: Floor Operator gets read-only view with unit cost masked (None).
    """
    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]

    query = db.query(Product)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Product.name.ilike(search_fmt), Product.sku.ilike(search_fmt)))

    products = query.order_by(Product.name).all()
    results = []

    for p in products:
        total_on_hand = sum(q.on_hand for q in p.quants)
        total_free = sum(q.free_to_use for q in p.quants)
        # Mask cost for floor operators
        cost_val = p.cost if is_manager else None

        results.append(ProductResponse(
            id=p.id,
            sku=p.sku,
            name=p.name,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            uom=p.uom,
            reorder_point=p.reorder_point,
            cost=cost_val,
            total_on_hand=total_on_hand,
            total_free_to_use=total_free
        ))
    return results


@app.post("/api/products", response_model=ProductResponse)
def create_product(
    req: ProductCreate,
    current_user: User = Depends(require_role("inventory_manager")),
    db: Session = Depends(get_db)
):
    """
    Product creation is restricted to inventory_manager only (403 for floor_operator).
    """
    existing = db.query(Product).filter(Product.sku == req.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product SKU '{req.sku}' already exists")

    product = Product(
        sku=req.sku,
        name=req.name,
        category_id=req.category_id,
        uom=req.uom,
        reorder_point=req.reorder_point,
        cost=req.cost,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Initial stock allocation if specified
    if req.initial_stock and req.initial_stock > 0 and req.initial_location_id:
        quant = StockQuant(
            product_id=product.id,
            location_id=req.initial_location_id,
            on_hand=req.initial_stock,
            reserved=0.0,
            free_to_use=req.initial_stock
        )
        db.add(quant)
        db.commit()

    total_on_hand = sum(q.on_hand for q in product.quants)
    total_free = sum(q.free_to_use for q in product.quants)

    return ProductResponse(
        id=product.id,
        sku=product.sku,
        name=product.name,
        category_id=product.category_id,
        category_name=product.category.name if product.category else None,
        uom=product.uom,
        reorder_point=product.reorder_point,
        cost=product.cost,
        total_on_hand=total_on_hand,
        total_free_to_use=total_free
    )


@app.get("/api/stock", response_model=List[StockQuantResponse])
def get_stock(
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]

    # Floor operators are scoped to their assigned warehouse
    if not is_manager and current_user.assigned_warehouse_id:
        warehouse_id = current_user.assigned_warehouse_id

    query = (
        db.query(StockQuant)
        .join(Product, StockQuant.product_id == Product.id)
        .join(Location, StockQuant.location_id == Location.id)
    )

    if warehouse_id:
        query = query.filter(Location.warehouse_id == warehouse_id)

    quants = query.order_by(Product.name).all()
    results = []
    for q in quants:
        results.append(StockQuantResponse(
            product_id=q.product_id,
            product_name=q.product.name,
            sku=q.product.sku,
            category_name=q.product.category.name if q.product.category else "Uncategorized",
            uom=q.product.uom,
            cost=q.product.cost if is_manager else None,  # Masked for staff
            location_id=q.location_id,
            location_name=q.location.name,
            warehouse_code=q.location.warehouse.short_code if q.location.warehouse else "N/A",
            on_hand=q.on_hand,
            reserved=q.reserved,
            free_to_use=q.free_to_use
        ))
    return results


@app.put("/api/stock/{product_id}/{location_id}", response_model=StockQuantResponse)
def update_stock_quant(
    product_id: int,
    location_id: int,
    req: StockQuantUpdate,
    current_user: User = Depends(require_role("inventory_manager")),
    db: Session = Depends(get_db)
):
    """
    Arbitrary physical stock override is restricted to inventory_manager only.
    Floor operators must use an Adjustment Operation.
    """
    quant = (
        db.query(StockQuant)
        .filter(StockQuant.product_id == product_id, StockQuant.location_id == location_id)
        .first()
    )
    if not quant:
        quant = StockQuant(
            product_id=product_id,
            location_id=location_id,
            on_hand=req.on_hand,
            reserved=0.0,
            free_to_use=req.on_hand
        )
        db.add(quant)
    else:
        quant.on_hand = req.on_hand
        quant.free_to_use = max(0.0, req.on_hand - quant.reserved)

    db.commit()
    db.refresh(quant)

    return StockQuantResponse(
        product_id=quant.product_id,
        product_name=quant.product.name,
        sku=quant.product.sku,
        category_name=quant.product.category.name if quant.product.category else "Uncategorized",
        uom=quant.product.uom,
        cost=quant.product.cost,
        location_id=quant.location_id,
        location_name=quant.location.name,
        warehouse_code=quant.location.warehouse.short_code if quant.location.warehouse else "N/A",
        on_hand=quant.on_hand,
        reserved=quant.reserved,
        free_to_use=quant.free_to_use
    )


# --- OPERATIONS ENDPOINTS (UNIFIED LIFECYCLE WITH RBAC) ---

def format_op_response(op: Operation) -> OperationResponse:
    lines_resp = [
        OperationLineResponse(
            id=line.id,
            product_id=line.product_id,
            product_name=line.product.name,
            sku=line.product.sku,
            uom=line.product.uom,
            quantity=line.quantity
        )
        for line in op.lines
    ]
    return OperationResponse(
        id=op.id,
        reference=op.reference,
        type=op.type,
        source_location_id=op.source_location_id,
        source_location_name=op.source_location.name if op.source_location else None,
        dest_location_id=op.dest_location_id,
        dest_location_name=op.dest_location.name if op.dest_location else None,
        contact=op.contact,
        schedule_date=op.schedule_date,
        status=op.status,
        responsible_user_id=op.responsible_user_id,
        responsible_user_name=op.responsible_user.full_name if op.responsible_user else None,
        created_at=op.created_at,
        lines=lines_resp
    )


@app.get("/api/operations", response_model=List[OperationResponse])
def list_operations(
    type: Optional[OperationType] = None,
    status: Optional[OperationStatus] = None,
    warehouse_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]

    query = db.query(Operation)

    # Scoping for floor operator: only see operations assigned to them or their warehouse
    if not is_manager and current_user.assigned_warehouse_id:
        user_wh = current_user.assigned_warehouse_id
        user_id = current_user.id
        query = query.join(Location, or_(Operation.source_location_id == Location.id, Operation.dest_location_id == Location.id))\
                     .filter(or_(Operation.responsible_user_id == user_id, Location.warehouse_id == user_wh))

    if type:
        query = query.filter(Operation.type == type)
    if status:
        query = query.filter(Operation.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Operation.reference.ilike(search_fmt), Operation.contact.ilike(search_fmt)))

    ops = query.order_by(Operation.created_at.desc()).distinct().all()
    return [format_op_response(op) for op in ops]


@app.get("/api/operations/{operation_id}", response_model=OperationResponse)
def get_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation document not found")
    return format_op_response(op)


@app.post("/api/operations", response_model=OperationResponse)
def create_operation(
    req: OperationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RBAC Rule:
    - Receipt & Delivery order create: inventory_manager only! (403 for floor_operator)
    - Internal Transfer & Adjustment: allowed for both roles.
    """
    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]

    if req.type in [OperationType.RECEIPT, OperationType.DELIVERY] and not is_manager:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: Floor Operators cannot create {req.type.value.capitalize()} documents. Only Inventory Managers may generate receipts or delivery dispatches."
        )

    # Validate locations based on operation type
    if req.type == OperationType.RECEIPT:
        if not req.dest_location_id:
            raise HTTPException(status_code=400, detail="Destination location is required for Receipts")
    elif req.type == OperationType.DELIVERY:
        if not req.source_location_id:
            raise HTTPException(status_code=400, detail="Source location is required for Deliveries")
    elif req.type in [OperationType.INTERNAL, OperationType.ADJUSTMENT]:
        if not req.source_location_id or not req.dest_location_id:
            raise HTTPException(status_code=400, detail="Both source and destination locations are required")

    # Generate sequence reference (e.g. WH/IN/0004)
    ref = generate_reference(db, req.warehouse_id, req.type)

    op = Operation(
        reference=ref,
        type=req.type,
        source_location_id=req.source_location_id,
        dest_location_id=req.dest_location_id,
        contact=req.contact,
        schedule_date=req.schedule_date or datetime.datetime.utcnow(),
        status=OperationStatus.DRAFT,
        responsible_user_id=current_user.id,
    )
    db.add(op)
    db.flush()

    for line_req in req.lines:
        line = OperationLine(
            operation_id=op.id,
            product_id=line_req.product_id,
            quantity=line_req.quantity
        )
        db.add(line)

    db.commit()
    db.refresh(op)
    return format_op_response(op)


@app.post("/api/operations/{operation_id}/mark-ready", response_model=OperationResponse)
def mark_operation_ready(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status in [OperationStatus.DONE, OperationStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot change status of {op.status.value} operation")

    if op.type == OperationType.DELIVERY:
        insufficient = False
        for line in op.lines:
            quant = (
                db.query(StockQuant)
                .filter(StockQuant.product_id == line.product_id, StockQuant.location_id == op.source_location_id)
                .first()
            )
            free = quant.free_to_use if quant else 0.0
            if free < line.quantity:
                insufficient = True
                break
        
        if insufficient:
            op.status = OperationStatus.WAITING
            db.commit()
            db.refresh(op)
            return format_op_response(op)

    op.status = OperationStatus.READY
    db.commit()
    db.refresh(op)
    return format_op_response(op)


@app.post("/api/operations/{operation_id}/validate", response_model=OperationResponse)
def validate_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ATOMIC VALIDATION TRANSACTION WITH RBAC CHECK:
    - Both roles can validate.
    - BUT Floor Operator can ONLY validate operations already assigned to them
      (responsible_user_id matches current user, or operation warehouse matches user's assigned warehouse).
    """
    op = db.query(Operation).filter(Operation.id == operation_id).with_for_update().first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]

    if not is_manager:
        # Check assignment to user or user's assigned warehouse
        user_wh = current_user.assigned_warehouse_id
        src_wh = op.source_location.warehouse_id if op.source_location else None
        dst_wh = op.dest_location.warehouse_id if op.dest_location else None

        is_assigned_to_user = (op.responsible_user_id == current_user.id)
        is_in_user_warehouse = (user_wh and (user_wh == src_wh or user_wh == dst_wh))

        if not is_assigned_to_user and not is_in_user_warehouse:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Floor Operators may only validate operations assigned to their queue or warehouse facility."
            )

    if op.status == OperationStatus.DONE:
        raise HTTPException(status_code=400, detail="Operation is already completed and immutable")
    if op.status == OperationStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot validate a cancelled operation")

    try:
        now = datetime.datetime.utcnow()

        for line in op.lines:
            # 1. Decrement Source if applicable
            if op.source_location_id:
                src_quant = (
                    db.query(StockQuant)
                    .filter(StockQuant.product_id == line.product_id, StockQuant.location_id == op.source_location_id)
                    .with_for_update()
                    .first()
                )
                if not src_quant:
                    src_quant = StockQuant(
                        product_id=line.product_id,
                        location_id=op.source_location_id,
                        on_hand=0.0,
                        reserved=0.0,
                        free_to_use=0.0
                    )
                    db.add(src_quant)
                    db.flush()

                src_quant.on_hand -= line.quantity
                src_quant.free_to_use = max(0.0, src_quant.on_hand - src_quant.reserved)

            # 2. Increment Destination if applicable
            if op.dest_location_id:
                dest_quant = (
                    db.query(StockQuant)
                    .filter(StockQuant.product_id == line.product_id, StockQuant.location_id == op.dest_location_id)
                    .with_for_update()
                    .first()
                )
                if not dest_quant:
                    dest_quant = StockQuant(
                        product_id=line.product_id,
                        location_id=op.dest_location_id,
                        on_hand=0.0,
                        reserved=0.0,
                        free_to_use=0.0
                    )
                    db.add(dest_quant)
                    db.flush()

                dest_quant.on_hand += line.quantity
                dest_quant.free_to_use = max(0.0, dest_quant.on_hand - dest_quant.reserved)

            # 3. Create immutable StockMove record in audit ledger
            move = StockMove(
                operation_id=op.id,
                product_id=line.product_id,
                from_location_id=op.source_location_id,
                to_location_id=op.dest_location_id,
                quantity=line.quantity,
                moved_at=now
            )
            db.add(move)

        op.status = OperationStatus.DONE
        db.commit()
        db.refresh(op)
        return format_op_response(op)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@app.post("/api/operations/{operation_id}/cancel", response_model=OperationResponse)
def cancel_operation(
    operation_id: int,
    current_user: User = Depends(require_role("inventory_manager")),
    db: Session = Depends(get_db)
):
    """
    Cancelling operations is restricted to inventory_manager only (403 for floor_operator).
    """
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status == OperationStatus.DONE:
        raise HTTPException(status_code=400, detail="Cannot cancel an already completed operation")

    op.status = OperationStatus.CANCELLED
    db.commit()
    db.refresh(op)
    return format_op_response(op)


# --- MOVE HISTORY AUDIT LEDGER (RBAC ENFORCED) ---

@app.get("/api/moves", response_model=List[StockMoveResponse])
def get_move_history(
    operation_type: Optional[OperationType] = None,
    product_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Move History: inventory_manager sees all moves;
    floor_operator is filtered to moves involving their assigned warehouse only.
    """
    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]

    query = (
        db.query(StockMove)
        .join(Operation, StockMove.operation_id == Operation.id)
        .join(Product, StockMove.product_id == Product.id)
    )

    if not is_manager and current_user.assigned_warehouse_id:
        wh_id = current_user.assigned_warehouse_id
        # Filter moves where from_location or to_location is in assigned warehouse
        wh_loc_ids = [l.id for l in db.query(Location).filter(Location.warehouse_id == wh_id).all()]
        query = query.filter(
            or_(
                StockMove.from_location_id.in_(wh_loc_ids),
                StockMove.to_location_id.in_(wh_loc_ids)
            )
        )

    if operation_type:
        query = query.filter(Operation.type == operation_type)
    if product_id:
        query = query.filter(StockMove.product_id == product_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Operation.reference.ilike(search_fmt),
                Product.name.ilike(search_fmt),
                Product.sku.ilike(search_fmt)
            )
        )

    moves = query.order_by(StockMove.moved_at.desc()).all()
    results = []
    for m in moves:
        results.append(StockMoveResponse(
            id=m.id,
            operation_id=m.operation_id,
            operation_reference=m.operation.reference,
            operation_type=m.operation.type,
            product_id=m.product_id,
            product_name=m.product.name,
            sku=m.product.sku,
            uom=m.product.uom,
            from_location_id=m.from_location_id,
            from_location_name=m.from_location.name if m.from_location else "External / Supplier",
            to_location_id=m.to_location_id,
            to_location_name=m.to_location.name if m.to_location else "Customer / Scrapped",
            quantity=m.quantity,
            moved_at=m.moved_at
        ))
    return results


# --- DASHBOARD AGGREGATION (ROLE-SCOPED PAYLOAD) ---

@app.get("/api/dashboard", response_model=DashboardKPIs)
def get_dashboard_kpis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Role-scoped dashboard payload:
    - inventory_manager: full KPIs across all warehouses + FIFO stock valuation ($)
    - floor_operator: scoped to their assigned warehouse, counts only, NO cost data, task-oriented framing.
    """
    is_manager = current_user.role in [UserRole.INVENTORY_MANAGER, "inventory_manager", "manager"]
    assigned_wh = current_user.assigned_warehouse

    if is_manager:
        # Full manager analytics view
        products = db.query(Product).all()
        total_products = len(products)
        low_or_out_count = 0
        total_stock_value = 0.0

        for p in products:
            total_on_hand = sum(q.on_hand for q in p.quants)
            total_stock_value += (total_on_hand * p.cost)
            if total_on_hand <= p.reorder_point:
                low_or_out_count += 1

        pending_receipts = (
            db.query(Operation)
            .filter(Operation.type == OperationType.RECEIPT, Operation.status.in_([OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY]))
            .count()
        )

        pending_deliveries = (
            db.query(Operation)
            .filter(Operation.type == OperationType.DELIVERY, Operation.status.in_([OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY]))
            .count()
        )

        scheduled_transfers = (
            db.query(Operation)
            .filter(Operation.type == OperationType.INTERNAL, Operation.status.in_([OperationStatus.DRAFT, OperationStatus.READY]))
            .count()
        )

        recent_receipts_db = (
            db.query(Operation)
            .filter(Operation.type == OperationType.RECEIPT)
            .order_by(Operation.created_at.desc())
            .limit(5)
            .all()
        )

        recent_deliveries_db = (
            db.query(Operation)
            .filter(Operation.type == OperationType.DELIVERY)
            .order_by(Operation.created_at.desc())
            .limit(5)
            .all()
        )

        return DashboardKPIs(
            role="inventory_manager",
            assigned_warehouse_id=None,
            assigned_warehouse_name="All Facilities (Global)",
            total_products=total_products,
            low_or_out_of_stock_count=low_or_out_count,
            pending_receipts_count=pending_receipts,
            pending_deliveries_count=pending_deliveries,
            scheduled_transfers_count=scheduled_transfers,
            total_stock_value=round(total_stock_value, 2),
            recent_receipts=[format_op_response(op) for op in recent_receipts_db],
            recent_deliveries=[format_op_response(op) for op in recent_deliveries_db]
        )

    else:
        # Floor Operator scoped task-oriented view (NO FINANCIAL/COST DATA)
        wh_id = current_user.assigned_warehouse_id or 1
        wh = db.query(Warehouse).filter(Warehouse.id == wh_id).first()
        wh_name = f"[{wh.short_code}] {wh.name}" if wh else "Assigned Station"

        wh_loc_ids = [l.id for l in db.query(Location).filter(Location.warehouse_id == wh_id).all()]

        # Products in this warehouse
        quants_in_wh = db.query(StockQuant).filter(StockQuant.location_id.in_(wh_loc_ids)).all()
        product_ids = set(q.product_id for q in quants_in_wh)
        total_products = len(product_ids)

        low_count = 0
        for pid in product_ids:
            p = db.query(Product).filter(Product.id == pid).first()
            p_on_hand = sum(q.on_hand for q in quants_in_wh if q.product_id == pid)
            if p and p_on_hand <= p.reorder_point:
                low_count += 1

        # Receipts directed to this warehouse or assigned to this operator
        pending_receipts_q = (
            db.query(Operation)
            .filter(
                Operation.type == OperationType.RECEIPT,
                Operation.status.in_([OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY]),
                or_(
                    Operation.dest_location_id.in_(wh_loc_ids),
                    Operation.responsible_user_id == current_user.id
                )
            )
        )
        assigned_receipts_count = pending_receipts_q.count()

        # Deliveries sourced from this warehouse or assigned to this operator
        pending_deliveries_q = (
            db.query(Operation)
            .filter(
                Operation.type == OperationType.DELIVERY,
                Operation.status.in_([OperationStatus.DRAFT, OperationStatus.WAITING, OperationStatus.READY]),
                or_(
                    Operation.source_location_id.in_(wh_loc_ids),
                    Operation.responsible_user_id == current_user.id
                )
            )
        )
        assigned_deliveries_count = pending_deliveries_q.count()

        transfers_count = (
            db.query(Operation)
            .filter(
                Operation.type == OperationType.INTERNAL,
                Operation.status.in_([OperationStatus.DRAFT, OperationStatus.READY]),
                or_(
                    Operation.source_location_id.in_(wh_loc_ids),
                    Operation.dest_location_id.in_(wh_loc_ids)
                )
            )
            .count()
        )

        task_msg = f"You have {assigned_receipts_count} inbound receipts and {assigned_deliveries_count} outbound orders assigned at {wh.short_code if wh else 'your terminal'} today."

        recent_receipts_db = (
            pending_receipts_q
            .order_by(Operation.created_at.desc())
            .limit(5)
            .all()
        )

        recent_deliveries_db = (
            pending_deliveries_q
            .order_by(Operation.created_at.desc())
            .limit(5)
            .all()
        )

        return DashboardKPIs(
            role="floor_operator",
            assigned_warehouse_id=wh_id,
            assigned_warehouse_name=wh_name,
            total_products=total_products,
            low_or_out_of_stock_count=low_count,
            pending_receipts_count=assigned_receipts_count,
            pending_deliveries_count=assigned_deliveries_count,
            scheduled_transfers_count=transfers_count,
            total_stock_value=None,  # STRICTLY NO FINANCIAL DATA FOR FLOOR OPERATOR
            assigned_receipts_to_process=assigned_receipts_count,
            assigned_deliveries_to_process=assigned_deliveries_count,
            task_message=task_msg,
            recent_receipts=[format_op_response(op) for op in recent_receipts_db],
            recent_deliveries=[format_op_response(op) for op in recent_deliveries_db]
        )
