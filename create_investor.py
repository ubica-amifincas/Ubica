import urllib.request
import json
import ssl

BASE_URL = "http://localhost:8000/api"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

def create_investor():
    print("Logging in as admin...")
    status, login_resp = make_request(f"{BASE_URL}/auth/login", method="POST", data={
        "email": "admin@amifincas.es",
        "password": "admin123"
    })
    
    if status != 200:
        print(f"Login failed: {login_resp}")
        return
        
    token = login_resp["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    new_user_data = {
        "email": "investor1@example.com",
        "password": "password123",
        "full_name": "Test Investor",
        "role": "investor",
        "company": "Test Company",
        "phone": "987654321"
    }
    print(f"Creating new user: {new_user_data['email']} with role {new_user_data['role']}...")
    status, create_resp = make_request(f"{BASE_URL}/admin/users", method="POST", data=new_user_data, headers=headers)
    
    if status == 200:
        print("User created successfully!")
        print(f"Created User ID: {create_resp['id']}, Role: {create_resp['role']}")
    else:
        print(f"Failed to create user. Status Code: {status}")
        print(create_resp)

if __name__ == "__main__":
    create_investor()
