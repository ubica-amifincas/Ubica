import os
import shutil
import glob
from collections import defaultdict
import json
import ast

# 1. Copiar y renombrar imagenes
source_dir = r"C:\Users\Pencho\.gemini\antigravity\brain\79bccbe3-f7c4-464a-87e2-070a5aff3b11"
dest_dir = r"d:\Proyects\Ubica_proyect\ubica_v2\ubica-portal\public\images"

patterns = {
    "villa_modern_1": "gen_villa_ext.png",
    "villa_interior_1": "gen_villa_int.png",
    "apt_exterior_1": "gen_apt_ext.png",
    "apt_interior_1": "gen_apt_int.png",
    "house_exterior_1": "gen_house_ext.png",
    "house_interior_1": "gen_house_int.png",
}

for pattern, new_name in patterns.items():
    files = glob.glob(os.path.join(source_dir, f"{pattern}*.png"))
    if files:
        latest_file = max(files, key=os.path.getctime)
        shutil.copy2(latest_file, os.path.join(dest_dir, new_name))
        print(f"Copied {latest_file} -> {new_name}")

# 2. Update Database Database
from sqlmodel import Session, select
from database import engine
from models import Property

new_props = []

with Session(engine) as session:
    props = session.exec(select(Property)).all()
    
    # Check if images is stored as a stringified python list and fix it
    for p in props:
        images_val = p.images
        
        # If it's a string that looks like a list "['...', '...']"
        if isinstance(images_val, str) and images_val.startswith("["):
            try:
                images_val = ast.literal_eval(images_val)
            except Exception:
                pass
                
        # Now images_val should be a list
        if isinstance(images_val, list):
            # Asign images based on type
            if p.type == "VILLA":
                p.images = json.dumps(["/images/gen_villa_ext.png", "/images/gen_villa_int.png"])
            elif p.type == "APARTAMENTO":
                p.images = json.dumps(["/images/gen_apt_ext.png", "/images/gen_apt_int.png"])
            elif p.type == "CASA":
                p.images = json.dumps(["/images/gen_house_ext.png", "/images/gen_house_int.png"])
            else:
                p.images = json.dumps([images_val[0]]) if len(images_val) > 0 else json.dumps([])
        else:
            p.images = json.dumps([])
        session.add(p)
        
    session.commit()
    print("Updated existing properties images.")
    
    # 3. Create new properties
    
    prop_alquiler = Property(
        title="Ático de Lujo con Vistas",
        type="APARTAMENTO",
        location="Centro de Murcia",
        address="Plaza Circular 5",
        price=1800,
        bedrooms=3,
        bathrooms=2,
        area=140,
        description="Espectacular ático céntrico, ideal para ejecutivos. Totalmente amueblado y equipado con electrodomésticos de alta gama.",
        status="for-rent",
        features=json.dumps(["Terraza 40m2", "Garaje incluido", "Aire Acondicionado central", "Domótica"]),
        images=json.dumps(["/images/gen_apt_int.png", "/images/gen_apt_ext.png"]),
        latitude=37.9922,
        longitude=-1.1307,
        year_built=2021,
        energy_rating="A",
        orientation="Sur",
        owner_id=1,
        realtor_id=2
    )

    prop_reservado = Property(
        title="Chalet Independiente Familiar",
        type="VILLA",
        location="Altorreal, Molina de Segura",
        address="Avenida del Golf 12",
        price=450000,
        bedrooms=5,
        bathrooms=4,
        area=320,
        description="Espacioso chalet en urbanización privada con vigilancia 24h. Perfectamente distribuido para la vida en familia.",
        status="reserved",
        features=json.dumps(["Piscina privada", "Jardín 800m2", "Sótano habilitado", "Barbacoa"]),
        images=json.dumps(["/images/gen_villa_ext.png", "/images/gen_villa_int.png"]),
        latitude=38.0335,
        longitude=-1.1895,
        year_built=2015,
        energy_rating="B",
        orientation="Este",
        owner_id=1,
        realtor_id=2
    )
    
    session.add(prop_alquiler)
    session.add(prop_reservado)
    session.commit()
    print("Created new properties.")
