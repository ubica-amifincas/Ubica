import requests

def test_admin_dashboard():
    # Login
    print("Iniciando sesión en producción...")
    login_resp = requests.post(
        "https://ubica-backend.onrender.com/api/auth/login",
        json={"email": "admin@amifincas.es", "password": "admin123"},
        headers={"Origin": "https://ubica.amifincas.es"}
    )
    if login_resp.status_code != 200:
        print("Login falló:", login_resp.status_code, login_resp.text)
        return
        
    token = login_resp.json()["access_token"]
    print(f"Token obtenido: {token[:20]}...")
    
    # Dashboard
    print("Obteniendo dashboard...")
    dash_resp = requests.get(
        "https://ubica-backend.onrender.com/api/admin/dashboard",
        headers={
            "Authorization": f"Bearer {token}",
            "Origin": "https://ubica.amifincas.es"
        }
    )
    print("Dashboard Response Code:", dash_resp.status_code)
    print("Dashboard Response Body:", dash_resp.text)

if __name__ == "__main__":
    test_admin_dashboard()
