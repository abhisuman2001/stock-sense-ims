import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from .models import OperationType, OperationStatus, UserRole


# Auth Schemas
class UserSignupRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = Field(..., description="Role is required at signup: inventory_manager or floor_operator")
    assigned_warehouse_id: Optional[int] = None


class UserLoginRequest(BaseModel):
    email: str
    password: str


class OTPRequest(BaseModel):
    email: str


class OTPVerifyResetRequest(BaseModel):
    email: str
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    assigned_warehouse_id: Optional[int] = None
    assigned_warehouse_code: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Category Schemas
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# Warehouse & Location Schemas
class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    short_code: str = Field(..., min_length=1, max_length=10)
    address: Optional[str] = None

    @field_validator("short_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.strip().upper()


class WarehouseResponse(BaseModel):
    id: int
    name: str
    short_code: str
    address: Optional[str] = None

    class Config:
        from_attributes = True


class LocationCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    short_code: str = Field(..., min_length=1, max_length=20)
    warehouse_id: Optional[int] = None

    @field_validator("short_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.strip().upper()


class LocationResponse(BaseModel):
    id: int
    name: str
    short_code: str
    warehouse_id: Optional[int] = None
    warehouse_code: Optional[str] = None

    class Config:
        from_attributes = True


# Product & Stock Schemas
class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    category_id: Optional[int] = None
    uom: str = Field(default="Units", min_length=1, max_length=20)
    reorder_point: float = Field(default=10.0, ge=0.0)
    cost: float = Field(default=0.0, ge=0.0)
    initial_stock: Optional[float] = Field(default=0.0, ge=0.0)
    initial_location_id: Optional[int] = None

    @field_validator("sku")
    @classmethod
    def uppercase_sku(cls, v: str) -> str:
        return v.strip().upper()


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    uom: Optional[str] = None
    reorder_point: Optional[float] = Field(default=None, ge=0.0)
    cost: Optional[float] = Field(default=None, ge=0.0)


class ProductResponse(BaseModel):
    id: int
    sku: str
    name: str
    category_id: Optional[int]
    category_name: Optional[str] = None
    uom: str
    reorder_point: float
    cost: Optional[float] = None
    total_on_hand: float = 0.0
    total_free_to_use: float = 0.0

    class Config:
        from_attributes = True


class StockQuantResponse(BaseModel):
    product_id: int
    product_name: str
    sku: str
    category_name: Optional[str]
    uom: str
    cost: Optional[float] = None
    location_id: int
    location_name: str
    warehouse_code: str
    on_hand: float
    reserved: float
    free_to_use: float

    class Config:
        from_attributes = True


class StockQuantUpdate(BaseModel):
    on_hand: float = Field(..., ge=0.0)


# Operations Schemas
class OperationLineCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0.0, description="Quantity must be strictly greater than 0")


class OperationLineResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    sku: str
    uom: str
    quantity: float

    class Config:
        from_attributes = True


class OperationCreate(BaseModel):
    warehouse_id: int
    type: OperationType
    source_location_id: Optional[int] = None
    dest_location_id: Optional[int] = None
    contact: Optional[str] = Field(None, max_length=150)
    schedule_date: Optional[datetime.datetime] = None
    lines: List[OperationLineCreate] = Field(..., min_length=1, description="Operation must have at least one line")


class OperationResponse(BaseModel):
    id: int
    reference: str
    type: OperationType
    source_location_id: Optional[int]
    source_location_name: Optional[str] = None
    dest_location_id: Optional[int]
    dest_location_name: Optional[str] = None
    contact: Optional[str] = None
    schedule_date: datetime.datetime
    status: OperationStatus
    responsible_user_id: Optional[int]
    responsible_user_name: Optional[str] = None
    created_at: datetime.datetime
    lines: List[OperationLineResponse] = []

    class Config:
        from_attributes = True


class StockMoveResponse(BaseModel):
    id: int
    operation_id: int
    operation_reference: str
    operation_type: OperationType
    product_id: int
    product_name: str
    sku: str
    uom: str
    from_location_id: Optional[int]
    from_location_name: Optional[str] = None
    to_location_id: Optional[int]
    to_location_name: Optional[str] = None
    quantity: float
    moved_at: datetime.datetime

    class Config:
        from_attributes = True


# Dashboard Aggregation Schema (Role-Scoped)
class DashboardKPIs(BaseModel):
    role: str
    assigned_warehouse_id: Optional[int] = None
    assigned_warehouse_name: Optional[str] = None
    total_products: int
    low_or_out_of_stock_count: int
    pending_receipts_count: int
    pending_deliveries_count: int
    scheduled_transfers_count: int
    total_stock_value: Optional[float] = None
    assigned_receipts_to_process: Optional[int] = None
    assigned_deliveries_to_process: Optional[int] = None
    task_message: Optional[str] = None
    recent_receipts: List[OperationResponse] = []
    recent_deliveries: List[OperationResponse] = []
