# -*- coding: utf-8 -*-
import logging
logging.disable(logging.CRITICAL)
from sqlalchemy import text
from sqlmodel import Session, create_engine

# Connect directly to Supabase Cloud
DB_USER = "postgres.iklqjuiodvmeynbcimwq"
DB_PASS = "3Ki^e48^P1K2%%&0"
DB_HOST = "aws-1-eu-north-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"
CLOUD_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(CLOUD_DATABASE_URL)

with Session(engine) as session:
    # Step 1: Update ALL existing properties to have 2 images
    # We keep their first original image and add a generated one as 2nd
    updates = {
        1: '["/images/casa-moderna.jpg", "/images/gen_villa_int.png"]',
        2: '["/images/apartamento-costa.jpg", "/images/gen_apt_int.png"]',
        3: '["/images/casa-rural.jpg", "/images/gen_house_int.png"]',
        4: '["/images/chalet-aguilas.jpg", "/images/gen_villa_int.png"]',
        5: '["/images/piso-ciudad.jpg", "/images/gen_apt_int.png"]',
        6: '["/images/apartamento-torre-pacheco.jpg", "/images/gen_villa_ext.png"]',
        7: '["/images/atico.jpg", "/images/gen_apt_ext.png"]',
        8: '["/images/casa-adosada.jpg", "/images/gen_house_ext.png"]',
        9: '["/images/estudio.jpg", "/images/gen_apt_int.png"]',
        10: '["/images/duplex.jpg", "/images/gen_house_int.png"]',
        11: '["/images/gen_house_ext.png", "/images/gen_house_int.png"]',
    }
    for pid, imgs_json in updates.items():
        session.execute(
            text("UPDATE property SET images = CAST(:imgs AS jsonb) WHERE id = :pid"),
            {"imgs": imgs_json, "pid": pid}
        )
    session.commit()
    print("Step 1 DONE: Updated all property images in CLOUD.")

    # Step 2: Fix the sequence
    session.execute(text("SELECT setval('property_id_seq', (SELECT MAX(id) FROM property))"))
    session.commit()
    print("Step 2 DONE: Sequence reset.")

    # Step 3: Insert new for-rent property
    session.execute(text("""
        INSERT INTO property (
            title, type, city, address, price, bedrooms, bathrooms, area,
            description, status, features, images, latitude, longitude, year_built,
            energy_rating, orientation, owner_id, realtor_id, region,
            created_at, updated_at, purchase_price, total_cost, monthly_cost, monthly_income
        ) VALUES (
            :title, :ptype, :city, :address, :price, :bed, :bath, :area,
            :descr, :status, CAST(:features AS jsonb), CAST(:images AS jsonb), :lat, :lng, :yb,
            :er, :orient, :oid, :rid, :region,
            NOW(), NOW(), 0, 0, 0, 0
        )
    """), {
        "title": "Atico de Lujo con Vistas al Centro",
        "ptype": "Apartamento",
        "city": "Murcia",
        "address": "Plaza Circular 5, Murcia",
        "price": 1800,
        "bed": 3, "bath": 2, "area": 140,
        "descr": "Espectacular atico centrico ideal para ejecutivos. Totalmente amueblado y equipado con electrodomesticos de alta gama. Terraza con vistas panoramicas.",
        "status": "for-rent",
        "features": '["Terraza 40m2", "Garaje incluido", "Aire Acondicionado", "Domotica"]',
        "images": '["/images/gen_apt_ext.png", "/images/gen_apt_int.png"]',
        "lat": 37.9922, "lng": -1.1307,
        "yb": 2021, "er": "A", "orient": "Sur",
        "oid": 1, "rid": 2, "region": "Murcia"
    })
    session.commit()
    print("Step 3 DONE: Inserted for-rent property.")

    # Step 4: Insert new reserved property
    session.execute(text("""
        INSERT INTO property (
            title, type, city, address, price, bedrooms, bathrooms, area,
            description, status, features, images, latitude, longitude, year_built,
            energy_rating, orientation, owner_id, realtor_id, region,
            created_at, updated_at, purchase_price, total_cost, monthly_cost, monthly_income
        ) VALUES (
            :title, :ptype, :city, :address, :price, :bed, :bath, :area,
            :descr, :status, CAST(:features AS jsonb), CAST(:images AS jsonb), :lat, :lng, :yb,
            :er, :orient, :oid, :rid, :region,
            NOW(), NOW(), 0, 0, 0, 0
        )
    """), {
        "title": "Chalet Independiente Familiar en Altorreal",
        "ptype": "Villa",
        "city": "Molina de Segura",
        "address": "Avenida del Golf 12, Altorreal",
        "price": 450000,
        "bed": 5, "bath": 4, "area": 320,
        "descr": "Espacioso chalet en urbanizacion privada con vigilancia 24h. Perfectamente distribuido para la vida en familia. Jardin con piscina y barbacoa.",
        "status": "reserved",
        "features": '["Piscina privada", "Jardin 800m2", "Sotano habilitado", "Barbacoa"]',
        "images": '["/images/gen_villa_ext.png", "/images/gen_villa_int.png"]',
        "lat": 38.0335, "lng": -1.1895,
        "yb": 2015, "er": "B", "orient": "Este",
        "oid": 1, "rid": 2, "region": "Murcia"
    })
    session.commit()
    print("Step 4 DONE: Inserted reserved property.")

    print("ALL DONE - Supabase Cloud DB updated!")
