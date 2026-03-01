import urllib.request
import json

BASE_URL = "http://localhost:8000/api"

# Login as admin
req = urllib.request.Request(
    f"{BASE_URL}/auth/login",
    data=json.dumps({"email": "admin@amifincas.es", "password": "admin123"}).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read().decode("utf-8"))["access_token"]

print(f"Logged in as admin. Token: {token[:20]}...")

# Create property with financial fields
prop_data = {
    "title": "Apartamento Inversion - Cartagena Centro",
    "price": 185000,
    "type": "apartamento",
    "status": "rented",
    "bedrooms": 2,
    "bathrooms": 1,
    "area": 75,
    "location": "Cartagena",
    "address": "Calle Mayor 15, Cartagena",
    "description": "Apartamento centrico ideal para inversion, actualmente alquilado con inquilino estable",
    "features": ["Aire acondicionado", "Terraza", "Cocina equipada"],
    "images": ["/images/casa-moderna.jpg"],
    "yearBuilt": 2015,
    "orientation": "Sur",
    "energyRating": "B",
    "coordinates": {"lat": 37.6050, "lng": -0.9918},
    "investmentData": {"roi": 5.5, "rentalYield": 6.0, "monthsOnMarket": 0},
    "purchasePrice": 160000,
    "totalCost": 180000,
    "monthlyCost": 350,
    "monthlyIncome": 900,
}

req2 = urllib.request.Request(
    f"{BASE_URL}/admin/properties",
    data=json.dumps(prop_data).encode("utf-8"),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    method="POST",
)
with urllib.request.urlopen(req2) as resp:
    result = json.loads(resp.read().decode("utf-8"))
    print(f"Property created!")
    print(f"  ID: {result['id']}")
    print(f"  Status: {result['status']}")
    print(f"  Owner ID: {result['owner_id']}")
    print(f"  Purchase Price: {result.get('purchase_price', 'N/A')}")
    print(f"  Total Cost: {result.get('total_cost', 'N/A')}")
    print(f"  Monthly Cost: {result.get('monthly_cost', 'N/A')}")
    print(f"  Monthly Income: {result.get('monthly_income', 'N/A')}")

print("\nDone! Property with financial data created successfully.")
