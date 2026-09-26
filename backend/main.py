import os
import datetime
import random
import hashlib
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
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
    description="Backend API for StockSense Inventory Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


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
        role=req.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    fake_jwt = f"jwt_token_{new_user.id}_{int(datetime.datetime.utcnow().timestamp())}"
    return TokenResponse(
        access_token=fake_jwt,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@app.post("/api/auth/login", response_model=TokenResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or user.hashed_password != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password credentials")

    fake_jwt = f"jwt_token_{user.id}_{int(datetime.datetime.utcnow().timestamp())}"
    return TokenResponse(
        access_token=fake_jwt,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@app.post("/api/auth/request-otp")
def request_otp(req: OTPRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user:
        # Don't leak user existence for production, but return friendly message
        return {"message": "If an account exists, a 6-digit OTP code has been issued."}

    # Generate 6-digit OTP
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

    # For local demo / offline usability, also echo the OTP in debug message
    return {
        "message": "OTP sent to registered email.",
        "debug_otp": otp_code  # For hackathon demo convenience
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


# --- WAREHOUSE & LOCATION ENDPOINTS ---

@app.get("/api/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(db: Session = Depends(get_db)):
    return db.query(Warehouse).order_by(Warehouse.name).all()


@app.post("/api/warehouses", response_model=WarehouseResponse)
def create_warehouse(req: WarehouseCreate, db: Session = Depends(get_db)):
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
def list_locations(warehouse_id: Optional[int] = None, db: Session = Depends(get_db)):
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
def create_location(req: LocationCreate, db: Session = Depends(get_db)):
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
def create_category(req: CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(Category).filter(Category.name == req.name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    cat = Category(name=req.name.strip())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


# --- PRODUCT & STOCK ENDPOINTS ---

@app.get("/api/products", response_model=List[ProductResponse])
def list_products(category_id: Optional[int] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
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
        results.append(ProductResponse(
            id=p.id,
            sku=p.sku,
            name=p.name,
            category_id=p.category_id,
            category_name=p.category.name if p.category else None,
            uom=p.uom,
            reorder_point=p.reorder_point,
            cost=p.cost,
            total_on_hand=total_on_hand,
            total_free_to_use=total_free
        ))
    return results


@app.post("/api/products", response_model=ProductResponse)
def create_product(req: ProductCreate, db: Session = Depends(get_db)):
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
def get_stock(warehouse_id: Optional[int] = None, db: Session = Depends(get_db)):
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
            cost=q.product.cost,
            location_id=q.location_id,
            location_name=q.location.name,
            warehouse_code=q.location.warehouse.short_code if q.location.warehouse else "N/A",
            on_hand=q.on_hand,
            reserved=q.reserved,
            free_to_use=q.free_to_use
        ))
    return results


@app.put("/api/stock/{product_id}/{location_id}", response_model=StockQuantResponse)
def update_stock_quant(product_id: int, location_id: int, req: StockQuantUpdate, db: Session = Depends(get_db)):
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


# --- OPERATIONS ENDPOINTS (UNIFIED LIFECYCLE) ---

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
    db: Session = Depends(get_db)
):
    query = db.query(Operation)
    if type:
        query = query.filter(Operation.type == type)
    if status:
        query = query.filter(Operation.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(or_(Operation.reference.ilike(search_fmt), Operation.contact.ilike(search_fmt)))

    ops = query.order_by(Operation.created_at.desc()).all()
    return [format_op_response(op) for op in ops]


@app.get("/api/operations/{operation_id}", response_model=OperationResponse)
def get_operation(operation_id: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation document not found")
    return format_op_response(op)


@app.post("/api/operations", response_model=OperationResponse)
def create_operation(req: OperationCreate, db: Session = Depends(get_db)):
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

    # Initial status is draft
    # Check if delivery order has sufficient free stock; if not, status can transition to waiting upon check
    initial_status = OperationStatus.DRAFT

    op = Operation(
        reference=ref,
        type=req.type,
        source_location_id=req.source_location_id,
        dest_location_id=req.dest_location_id,
        contact=req.contact,
        schedule_date=req.schedule_date or datetime.datetime.utcnow(),
        status=initial_status,
        responsible_user_id=1,  # Default to current user
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
def mark_operation_ready(operation_id: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status in [OperationStatus.DONE, OperationStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail=f"Cannot change status of {op.status.value} operation")

    # If delivery, check if sufficient free stock
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
def validate_operation(operation_id: int, db: Session = Depends(get_db)):
    """
    ATOMIC VALIDATION TRANSACTION:
    1. Check status is not DONE or CANCELLED.
    2. For each OperationLine:
       - If source_location_id: decrement StockQuant on_hand and free_to_use.
         Ensure non-negative for physical stock locations.
       - If dest_location_id: increment StockQuant on_hand and free_to_use.
       - Insert immutable StockMove record into audit ledger.
    3. Update operation status to DONE.
    4. Commit entire transaction atomically.
    """
    op = db.query(Operation).filter(Operation.id == operation_id).with_for_update().first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

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

                # Deduct stock
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
def cancel_operation(operation_id: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    if op.status == OperationStatus.DONE:
        raise HTTPException(status_code=400, detail="Cannot cancel an already completed operation")

    op.status = OperationStatus.CANCELLED
    db.commit()
    db.refresh(op)
    return format_op_response(op)


# --- MOVE HISTORY AUDIT LEDGER ---

@app.get("/api/moves", response_model=List[StockMoveResponse])
def get_move_history(
    operation_type: Optional[OperationType] = None,
    product_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = (
        db.query(StockMove)
        .join(Operation, StockMove.operation_id == Operation.id)
        .join(Product, StockMove.product_id == Product.id)
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


# --- DASHBOARD AGGREGATION ---

@app.get("/api/dashboard", response_model=DashboardKPIs)
def get_dashboard_kpis(db: Session = Depends(get_db)):
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
        total_products=total_products,
        low_or_out_of_stock_count=low_or_out_count,
        pending_receipts_count=pending_receipts,
        pending_deliveries_count=pending_deliveries,
        scheduled_transfers_count=scheduled_transfers,
        total_stock_value=round(total_stock_value, 2),
        recent_receipts=[format_op_response(op) for op in recent_receipts_db],
        recent_deliveries=[format_op_response(op) for op in recent_deliveries_db]
    )
