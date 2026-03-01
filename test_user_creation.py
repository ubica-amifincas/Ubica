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

def test_user_creation():
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
    
    print("Fetching users before creation...")
    status, users_resp = make_request(f"{BASE_URL}/admin/users", method="GET", headers=headers)
    print(f"Users count: {len(users_resp)}")
    
    new_user_data = {
        "email": "testrealtor@example.com",
        "password": "password123",
        "full_name": "Test Realtor",
        "role": "realtor",
        "company": "Test Company",
        "phone": "123456789"
    }
    print(f"Creating new user: {new_user_data['email']} with role {new_user_data['role']}...")
    status, create_resp = make_request(f"{BASE_URL}/admin/users", method="POST", data=new_user_data, headers=headers)
    
    if status == 200:
        print("User created successfully!")
        print(f"Created User ID: {create_resp['id']}, Role: {create_resp['role']}")
    else:
        print(f"Failed to create user. Status Code: {status}")
        print(create_resp)
        return

    print("Fetching users after creation...")
    status, users_resp2 = make_request(f"{BASE_URL}/admin/users", method="GET", headers=headers)
    
    found = False
    for u in users_resp2:
        if u["email"] == "testrealtor@example.com":
            found = True
            print(f"Found created user in list - Role: {u['role']}")
            break
            
    if found:
        print("SUCCESS! User creation and role persistence verified.")
    else:
        print("ERROR! Created user not found in the list.")

if __name__ == "__main__":
    test_user_creation()
