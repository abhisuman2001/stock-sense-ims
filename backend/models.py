import datetime
from sqlalchemy import (
    Column, Integer, String, Float, ForeignKey, DateTime, Enum as SQLEnum,
    UniqueConstraint, Sequence, text
)
from sqlalchemy.orm import relationship
import enum

from .database import Base


class OperationType(str, enum.Enum):
    RECEIPT = "receipt"
    DELIVERY = "delivery"
    INTERNAL = "internal"
    ADJUSTMENT = "adjustment"


class OperationStatus(str, enum.Enum):
    DRAFT = "draft"
    WAITING = "waiting"
    READY = "ready"
    DONE = "done"
    CANCELLED = "cancelled"


class UserRole(str, enum.Enum):
    MANAGER = "manager"
    STAFF = "staff"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.STAFF, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    operations = relationship("Operation", back_populates="responsible_user")


class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    otp_code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_used = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    products = relationship("Product", back_populates="category")


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    short_code = Column(String(10), unique=True, nullable=False, index=True)
    address = Column(String(255), nullable=True)

    locations = relationship("Location", back_populates="warehouse", cascade="all, delete-orphan")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    short_code = Column(String(20), nullable=False)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=True)

    warehouse = relationship("Warehouse", back_populates="locations")
    quants = relationship("StockQuant", back_populates="location")

    __table_args__ = (
        UniqueConstraint("warehouse_id", "short_code", name="uq_warehouse_location_code"),
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    uom = Column(String(20), nullable=False, default="Units")  # Unit of measure (e.g., Units, kg, Boxes)
    reorder_point = Column(Float, nullable=False, default=10.0)
    cost = Column(Float, nullable=False, default=0.0)

    category = relationship("Category", back_populates="products")
    quants = relationship("StockQuant", back_populates="product", cascade="all, delete-orphan")
    operation_lines = relationship("OperationLine", back_populates="product")
    moves = relationship("StockMove", back_populates="product")


class StockQuant(Base):
    """
    Physical inventory ledger at location level.
    free_to_use is calculated as on_hand - reserved.
    """
    __tablename__ = "stock_quants"

    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="CASCADE"), primary_key=True)
    on_hand = Column(Float, nullable=False, default=0.0)
    reserved = Column(Float, nullable=False, default=0.0)
    free_to_use = Column(Float, nullable=False, default=0.0)

    product = relationship("Product", back_populates="quants")
    location = relationship("Location", back_populates="quants")


class Operation(Base):
    """
    Unified operations concept for receipts, deliveries, internal transfers, and adjustments.
    """
    __tablename__ = "operations"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(60), unique=True, nullable=False, index=True)
    type = Column(SQLEnum(OperationType), nullable=False)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    contact = Column(String(150), nullable=True)  # Vendor, Customer, or Department
    schedule_date = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    status = Column(SQLEnum(OperationStatus), default=OperationStatus.DRAFT, nullable=False)
    responsible_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    source_location = relationship("Location", foreign_keys=[source_location_id])
    dest_location = relationship("Location", foreign_keys=[dest_location_id])
    responsible_user = relationship("User", back_populates="operations")
    lines = relationship("OperationLine", back_populates="operation", cascade="all, delete-orphan")
    moves = relationship("StockMove", back_populates="operation", cascade="all, delete-orphan")


class OperationLine(Base):
    __tablename__ = "operation_lines"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = Column(Float, nullable=False)

    operation = relationship("Operation", back_populates="lines")
    product = relationship("Product", back_populates="operation_lines")


class StockMove(Base):
    """
    Immutable audit ledger entry recording every confirmed stock transition.
    """
    __tablename__ = "stock_moves"

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey("operations.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    quantity = Column(Float, nullable=False)
    moved_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    operation = relationship("Operation", back_populates="moves")
    product = relationship("Product", back_populates="moves")
    from_location = relationship("Location", foreign_keys=[from_location_id])
    to_location = relationship("Location", foreign_keys=[to_location_id])


class SequenceCounter(Base):
    """
    Stores sequence per warehouse_short_code and operation_type for reference numbers
    (e.g., WH/IN/0001, CS/OUT/0002).
    """
    __tablename__ = "sequence_counters"

    id = Column(Integer, primary_key=True, index=True)
    warehouse_code = Column(String(10), nullable=False)
    operation_type = Column(String(20), nullable=False)
    next_val = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        UniqueConstraint("warehouse_code", "operation_type", name="uq_seq_warehouse_type"),
    )
