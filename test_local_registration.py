import requests
import time

url = "http://localhost:8004/api/auth/register"
payload = {
    "email": "xennzopc@gmail.com",
    "password": "password123",
    "full_name": "Test User",
    "role": "realtor"
}

for i in range(10):
    try:
        resp = requests.post(url, json=payload)
        print("Status", resp.status_code)
        print(resp.text)
        break
    except requests.exceptions.ConnectionError:
        print("Waiting for server...")
        time.sleep(1)
