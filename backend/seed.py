import datetime
import hashlib
from backend.database import SessionLocal, engine, Base
from backend.models import (
    User, UserRole, Category, Warehouse, Location,
    Product, StockQuant, Operation, OperationType, OperationStatus,
    OperationLine, StockMove, SequenceCounter
)


def hash_pwd(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Warehouse).first():
            print("Database already seeded. Skipping.")
            return

        print("Seeding StockSense database with initial operational data...")

        # 1. Users
        manager = User(
            email="demo@stocksense.io",
            hashed_password=hash_pwd("Password123!"),
            full_name="Sarah Connor (Inventory Manager)",
            role=UserRole.MANAGER,
        )
        staff = User(
            email="staff@stocksense.io",
            hashed_password=hash_pwd("Password123!"),
            full_name="Alex Vance (Floor Operator)",
            role=UserRole.STAFF,
        )
        db.add_all([manager, staff])
        db.flush()

        # 2. Warehouses & Locations
        wh_main = Warehouse(name="Main Central Facility", short_code="WH", address="Dock 4B, Industrial Zone West")
        wh_cold = Warehouse(name="Cold Storage Annex", short_code="CS", address="Sector 7, North Logistics Park")
        db.add_all([wh_main, wh_cold])
        db.flush()

        loc_wh_stock = Location(name="General Stock Storage", short_code="STOCK", warehouse_id=wh_main.id)
        loc_wh_input = Location(name="Incoming Goods Bay", short_code="INPUT", warehouse_id=wh_main.id)
        loc_wh_output = Location(name="Outbound Dispatch Dock", short_code="OUTPUT", warehouse_id=wh_main.id)
        loc_wh_scrap = Location(name="Damaged / Scrap Hold", short_code="SCRAP", warehouse_id=wh_main.id)

        loc_cs_stock = Location(name="Cold Room Vault", short_code="STOCK", warehouse_id=wh_cold.id)
        loc_cs_input = Location(name="Chilled Inbound Bay", short_code="INPUT", warehouse_id=wh_cold.id)
        loc_cs_output = Location(name="Reefer Staging Dock", short_code="OUTPUT", warehouse_id=wh_cold.id)

        db.add_all([loc_wh_stock, loc_wh_input, loc_wh_output, loc_wh_scrap, loc_cs_stock, loc_cs_input, loc_cs_output])
        db.flush()

        # Sequence counters
        seqs = [
            SequenceCounter(warehouse_code="WH", operation_type="receipt", next_val=4),
            SequenceCounter(warehouse_code="WH", operation_type="delivery", next_val=3),
            SequenceCounter(warehouse_code="WH", operation_type="internal", next_val=2),
            SequenceCounter(warehouse_code="WH", operation_type="adjustment", next_val=2),
            SequenceCounter(warehouse_code="CS", operation_type="receipt", next_val=2),
            SequenceCounter(warehouse_code="CS", operation_type="delivery", next_val=1),
        ]
        db.add_all(seqs)
        db.flush()

        # 3. Categories
        cat_raw = Category(name="Raw Materials & Metals")
        cat_elec = Category(name="Electronics & Sensors")
        cat_fast = Category(name="Hardware & Fasteners")
        cat_fin = Category(name="Finished Assemblies")
        db.add_all([cat_raw, cat_elec, cat_fast, cat_fin])
        db.flush()

        # 4. Products
        p1 = Product(sku="STL-ROD-12", name="Steel Rod 12mm Cold-Rolled", category_id=cat_raw.id, uom="Meters", cost=18.50, reorder_point=60.0)
        p2 = Product(sku="SEN-MOD-42", name="Infrared Sensor Module V2", category_id=cat_elec.id, uom="Units", cost=7.20, reorder_point=30.0)
        p3 = Product(sku="LTH-BAT-24", name="Lithium-Ion Battery Pack 24V", category_id=cat_elec.id, uom="Units", cost=85.00, reorder_point=20.0)
        p4 = Product(sku="SCR-HEX-M8", name="Hex Bolt M8x40mm High-Tensile (Box 100)", category_id=cat_fast.id, uom="Boxes", cost=14.50, reorder_point=45.0)
        p5 = Product(sku="MOT-BLDC-48", name="Brushless DC Motor 48V 750W", category_id=cat_fin.id, uom="Units", cost=125.00, reorder_point=15.0)
        p6 = Product(sku="PNE-VLV-10", name="Pneumatic Directional Solenoid Valve", category_id=cat_fin.id, uom="Units", cost=46.00, reorder_point=25.0)
        db.add_all([p1, p2, p3, p4, p5, p6])
        db.flush()

        # 5. Stock Quants (at loc_wh_stock and loc_cs_stock)
        quants = [
            StockQuant(product_id=p1.id, location_id=loc_wh_stock.id, on_hand=120.0, reserved=20.0, free_to_use=100.0),
            StockQuant(product_id=p2.id, location_id=loc_wh_stock.id, on_hand=22.0, reserved=0.0, free_to_use=22.0), # LOW STOCK (below 30)
            StockQuant(product_id=p3.id, location_id=loc_wh_stock.id, on_hand=8.0, reserved=8.0, free_to_use=0.0),   # OUT OF FREE STOCK / LOW
            StockQuant(product_id=p4.id, location_id=loc_wh_stock.id, on_hand=95.0, reserved=15.0, free_to_use=80.0),
            StockQuant(product_id=p5.id, location_id=loc_wh_stock.id, on_hand=35.0, reserved=0.0, free_to_use=35.0),
            StockQuant(product_id=p6.id, location_id=loc_wh_stock.id, on_hand=14.0, reserved=0.0, free_to_use=14.0), # LOW STOCK (below 25)
            # Cold Storage
            StockQuant(product_id=p3.id, location_id=loc_cs_stock.id, on_hand=24.0, reserved=0.0, free_to_use=24.0),
        ]
        db.add_all(quants)
        db.flush()

        # 6. Operations & Stock Moves (Initial live history)
        # Done receipt: WH/IN/0001
        op1 = Operation(
            reference="WH/IN/0001",
            type=OperationType.RECEIPT,
            source_location_id=loc_wh_input.id,
            dest_location_id=loc_wh_stock.id,
            contact="Nippon Steel Supplies Corp",
            schedule_date=datetime.datetime.utcnow() - datetime.timedelta(days=2),
            status=OperationStatus.DONE,
            responsible_user_id=manager.id,
        )
        db.add(op1)
        db.flush()
        db.add(OperationLine(operation_id=op1.id, product_id=p1.id, quantity=50.0))
        db.add(StockMove(
            operation_id=op1.id,
            product_id=p1.id,
            from_location_id=loc_wh_input.id,
            to_location_id=loc_wh_stock.id,
            quantity=50.0,
            moved_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
        ))

        # Ready receipt: WH/IN/0002
        op2 = Operation(
            reference="WH/IN/0002",
            type=OperationType.RECEIPT,
            source_location_id=loc_wh_input.id,
            dest_location_id=loc_wh_stock.id,
            contact="Sensirion Tech Ltd",
            schedule_date=datetime.datetime.utcnow() + datetime.timedelta(hours=6),
            status=OperationStatus.READY,
            responsible_user_id=staff.id,
        )
        db.add(op2)
        db.flush()
        db.add(OperationLine(operation_id=op2.id, product_id=p2.id, quantity=40.0))

        # Draft receipt: WH/IN/0003
        op3 = Operation(
            reference="WH/IN/0003",
            type=OperationType.RECEIPT,
            source_location_id=loc_wh_input.id,
            dest_location_id=loc_wh_stock.id,
            contact="Apex Fasteners GmbH",
            schedule_date=datetime.datetime.utcnow() + datetime.timedelta(days=1),
            status=OperationStatus.DRAFT,
            responsible_user_id=manager.id,
        )
        db.add(op3)
        db.flush()
        db.add(OperationLine(operation_id=op3.id, product_id=p4.id, quantity=25.0))

        # Waiting delivery: WH/OUT/0001 (insufficient free stock)
        op4 = Operation(
            reference="WH/OUT/0001",
            type=OperationType.DELIVERY,
            source_location_id=loc_wh_stock.id,
            dest_location_id=loc_wh_output.id,
            contact="Tesla Gigafactory Assembly Bay 9",
            schedule_date=datetime.datetime.utcnow() + datetime.timedelta(days=1),
            status=OperationStatus.WAITING,
            responsible_user_id=manager.id,
        )
        db.add(op4)
        db.flush()
        db.add(OperationLine(operation_id=op4.id, product_id=p3.id, quantity=16.0))

        # Ready delivery: WH/OUT/0002
        op5 = Operation(
            reference="WH/OUT/0002",
            type=OperationType.DELIVERY,
            source_location_id=loc_wh_stock.id,
            dest_location_id=loc_wh_output.id,
            contact="RoboDrive Dynamics Inc",
            schedule_date=datetime.datetime.utcnow() + datetime.timedelta(hours=4),
            status=OperationStatus.READY,
            responsible_user_id=staff.id,
        )
        db.add(op5)
        db.flush()
        db.add(OperationLine(operation_id=op5.id, product_id=p1.id, quantity=20.0))
        db.add(OperationLine(operation_id=op5.id, product_id=p4.id, quantity=15.0))

        # Ready internal transfer: WH/INT/0001
        op6 = Operation(
            reference="WH/INT/0001",
            type=OperationType.INTERNAL,
            source_location_id=loc_wh_stock.id,
            dest_location_id=loc_cs_stock.id,
            contact="Internal Inter-Facility Transfer",
            schedule_date=datetime.datetime.utcnow() + datetime.timedelta(hours=12),
            status=OperationStatus.READY,
            responsible_user_id=manager.id,
        )
        db.add(op6)
        db.flush()
        db.add(OperationLine(operation_id=op6.id, product_id=p3.id, quantity=4.0))

        # Adjustment: WH/ADJ/0001 (Done)
        op7 = Operation(
            reference="WH/ADJ/0001",
            type=OperationType.ADJUSTMENT,
            source_location_id=loc_wh_stock.id,
            dest_location_id=loc_wh_scrap.id,
            contact="Q3 Cycle Count Correction (2 damaged)",
            schedule_date=datetime.datetime.utcnow() - datetime.timedelta(days=4),
            status=OperationStatus.DONE,
            responsible_user_id=manager.id,
        )
        db.add(op7)
        db.flush()
        db.add(OperationLine(operation_id=op7.id, product_id=p5.id, quantity=2.0))
        db.add(StockMove(
            operation_id=op7.id,
            product_id=p5.id,
            from_location_id=loc_wh_stock.id,
            to_location_id=loc_wh_scrap.id,
            quantity=2.0,
            moved_at=datetime.datetime.utcnow() - datetime.timedelta(days=4),
        ))

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
