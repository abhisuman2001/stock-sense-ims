"""Initial schema for StockSense Inventory Management System

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-25 21:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('manager', 'staff', name='userrole'), nullable=False, server_default='staff'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. Password Reset OTPs
    op.create_table(
        'password_reset_otps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('otp_code', sa.String(length=6), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_reset_otps_id'), 'password_reset_otps', ['id'], unique=False)
    op.create_index(op.f('ix_password_reset_otps_email'), 'password_reset_otps', ['email'], unique=False)

    # 3. Categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_categories_id'), 'categories', ['id'], unique=False)

    # 4. Warehouses table
    op.create_table(
        'warehouses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('short_code', sa.String(length=10), nullable=False),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_warehouses_id'), 'warehouses', ['id'], unique=False)
    op.create_index(op.f('ix_warehouses_short_code'), 'warehouses', ['short_code'], unique=True)

    # 5. Locations table
    op.create_table(
        'locations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('short_code', sa.String(length=20), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('warehouse_id', 'short_code', name='uq_warehouse_location_code')
    )
    op.create_index(op.f('ix_locations_id'), 'locations', ['id'], unique=False)

    # 6. Products table
    op.create_table(
        'products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sku', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=True),
        sa.Column('uom', sa.String(length=20), nullable=False, server_default='Units'),
        sa.Column('reorder_point', sa.Float(), nullable=False, server_default='10.0'),
        sa.Column('cost', sa.Float(), nullable=False, server_default='0.0'),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=True)

    # 7. Stock Quants table (Composite Primary Key: product_id, location_id)
    op.create_table(
        'stock_quants',
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('on_hand', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('reserved', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('free_to_use', sa.Float(), nullable=False, server_default='0.0'),
        sa.ForeignKeyConstraint(['location_id'], ['locations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('product_id', 'location_id')
    )

    # 8. Operations table
    op.create_table(
        'operations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reference', sa.String(length=60), nullable=False),
        sa.Column('type', sa.Enum('receipt', 'delivery', 'internal', 'adjustment', name='operationtype'), nullable=False),
        sa.Column('source_location_id', sa.Integer(), nullable=True),
        sa.Column('dest_location_id', sa.Integer(), nullable=True),
        sa.Column('contact', sa.String(length=150), nullable=True),
        sa.Column('schedule_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('status', sa.Enum('draft', 'waiting', 'ready', 'done', 'cancelled', name='operationstatus'), nullable=False, server_default='draft'),
        sa.Column('responsible_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['dest_location_id'], ['locations.id']),
        sa.ForeignKeyConstraint(['source_location_id'], ['locations.id']),
        sa.ForeignKeyConstraint(['responsible_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_operations_id'), 'operations', ['id'], unique=False)
    op.create_index(op.f('ix_operations_reference'), 'operations', ['reference'], unique=True)

    # 9. Operation Lines table
    op.create_table(
        'operation_lines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('operation_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['operation_id'], ['operations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_operation_lines_id'), 'operation_lines', ['id'], unique=False)

    # 10. Stock Moves audit ledger table
    op.create_table(
        'stock_moves',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('operation_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('from_location_id', sa.Integer(), nullable=True),
        sa.Column('to_location_id', sa.Integer(), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('moved_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['from_location_id'], ['locations.id']),
        sa.ForeignKeyConstraint(['operation_id'], ['operations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['to_location_id'], ['locations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stock_moves_id'), 'stock_moves', ['id'], unique=False)

    # 11. Sequence Counters for reference formatting (WH/IN/0001, WH/OUT/0002)
    op.create_table(
        'sequence_counters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('warehouse_code', sa.String(length=10), nullable=False),
        sa.Column('operation_type', sa.String(length=20), nullable=False),
        sa.Column('next_val', sa.Integer(), nullable=False, server_default='1'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('warehouse_code', 'operation_type', name='uq_seq_warehouse_type')
    )


def downgrade() -> None:
    op.drop_table('sequence_counters')
    op.drop_table('stock_moves')
    op.drop_table('operation_lines')
    op.drop_table('operations')
    op.drop_table('stock_quants')
    op.drop_table('products')
    op.drop_table('locations')
    op.drop_table('warehouses')
    op.drop_table('categories')
    op.drop_table('password_reset_otps')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS operationstatus;")
    op.execute("DROP TYPE IF EXISTS operationtype;")
    op.execute("DROP TYPE IF EXISTS userrole;")
