import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_dashboard_endpoints():
    # Login as Pencho
    login_data = {
        "email": "fulgencionm01@gmail.com",
        "password": "password123" # I saw this in users.json or assumed it
    }
    
    print(f"Logging in as {login_data['email']}...")
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"Login failed: {response.status_code} {response.text}")
        return

    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        "/user/properties",
        "/user/messages",
        "/user/messages/received",
        "/user/conversations"
    ]
    
    for endpoint in endpoints:
        print(f"\nTesting {endpoint}...")
        res = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        print(f"Status: {res.status_code}")
        try:
            print(f"Response: {json.dumps(res.json(), indent=2)[:500]}...")
        except:
            print(f"Response (text): {res.text[:500]}")

if __name__ == "__main__":
    test_dashboard_endpoints()
