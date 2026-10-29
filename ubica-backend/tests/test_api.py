from conftest import auth, make_token


# --- Salud ---

def test_health_and_ping(client, make_user, make_property):
    make_user()
    make_property()
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["database"] == "connected"
    assert body["total_properties"] == 1 and body["total_users"] == 1
    assert client.get("/api/ping").json()["message"] == "pong"


def test_removed_debug_endpoints(client):
    for path in ["/api/test-email", "/api/net", "/api/debug/email-logs", "/api/debug/network-test"]:
        assert client.get(path).status_code == 404


# --- Autenticación ---

def test_register_verify_and_login(client, db):
    r = client.post("/api/auth/register", json={"email": "new@example.com", "password": "pw123456", "full_name": "Nuevo"})
    assert r.status_code == 200
    user_id = r.json()["user_id"]

    r = client.post("/api/auth/login", json={"email": "new@example.com", "password": "pw123456"})
    assert r.status_code == 403  # sin verificar

    assert client.post("/api/auth/register", json={"email": "new@example.com", "password": "x"}).status_code == 400

    token = make_token(user_id, type="verify")
    assert client.get(f"/api/auth/verify-email?token={token}").status_code == 200
    assert "ya había" in client.get(f"/api/auth/verify-email?token={token}").json()["message"]
    assert client.get(f"/api/auth/verify-email?token={make_token(user_id)}").status_code == 400

    r = client.post("/api/auth/login", json={"email": "new@example.com", "password": "pw123456"})
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "new@example.com"
    assert "hashed_password" not in r.json()["user"]


def test_register_cannot_choose_admin_role(client):
    r = client.post("/api/auth/register", json={"email": "evil@example.com", "password": "x", "role": "admin"})
    assert r.status_code == 400
    r = client.post("/api/auth/register", json={"email": "agente@example.com", "password": "x", "role": "realtor"})
    assert r.status_code == 200


def test_login_wrong_password(client, make_user):
    make_user()
    assert client.post("/api/auth/login", json={"email": "user@example.com", "password": "bad"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"}).status_code == 401


def test_login_migrates_legacy_sha256(client, make_user, db):
    import models
    user = make_user(legacy=True)
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "secret123"})
    assert r.status_code == 200
    db.expire_all()
    assert db.get(models.User, user.id).hashed_password.startswith("$2")
    assert client.post("/api/auth/login", json={"email": "user@example.com", "password": "secret123"}).status_code == 200


def test_me_requires_valid_token(client, make_user):
    user = make_user()
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer abc"}).status_code == 401
    r = client.get("/api/auth/me", headers=auth(user))
    assert r.status_code == 200 and r.json()["email"] == "user@example.com"
    assert "hashed_password" not in r.json()


# --- Subida de imágenes ---

def test_upload_images(client, make_user):
    user = make_user()
    png = ("a.png", b"\x89PNG\r\n", "image/png")
    assert client.post("/api/upload-images", files={"files": png}).status_code == 401
    assert client.post("/api/upload-images", files={"files": ("a.exe", b"x", "application/octet-stream")}, headers=auth(user)).status_code == 400
    r = client.post("/api/upload-images", files={"files": png}, headers=auth(user))
    assert r.status_code == 200 and r.json()["urls"][0].endswith(".png")


# --- Propiedades públicas ---

def test_public_properties(client, make_property):
    visible = make_property(status="for-sale")
    make_property(status="sold", title="Vendida")
    r = client.get("/api/properties")
    assert [p["id"] for p in r.json()] == [visible.id]
    assert client.get(f"/api/properties/{visible.id}").json()["title"] == "Piso en Cartagena"
    assert client.get("/api/properties/999").status_code == 404
    stats = client.get("/api/stats/market").json()
    assert stats["total_properties"] == 2 and stats["cities"] == ["Cartagena"]


# --- Admin ---

def test_admin_requires_admin_role(client, make_user):
    user = make_user()
    assert client.get("/api/admin/users").status_code == 401
    assert client.get("/api/admin/users", headers=auth(user)).status_code == 403


def test_admin_user_crud(client, make_user):
    admin = make_user(email="admin@example.com", role="admin")
    h = auth(admin)
    r = client.post("/api/admin/users", json={"email": "b@example.com", "password": "clave-segura", "role": "realtor"}, headers=h)
    assert r.status_code == 200 and "hashed_password" not in r.json()
    new_id = r.json()["id"]
    assert client.post("/api/admin/users", json={"email": "b@example.com", "password": "clave-segura"}, headers=h).status_code == 400
    assert client.post("/api/admin/users", json={"email": "c@example.com"}, headers=h).status_code == 422

    users = client.get("/api/admin/users", headers=h).json()
    assert {u["email"] for u in users} == {"admin@example.com", "b@example.com"}
    assert all("hashed_password" not in u for u in users)

    r = client.put(f"/api/admin/users/{new_id}", json={"full_name": "Bea", "password": "nueva-clave"}, headers=h)
    assert r.json()["full_name"] == "Bea"
    assert client.post("/api/auth/login", json={"email": "b@example.com", "password": "nueva-clave"}).status_code == 200
    assert client.put("/api/admin/users/999", json={}, headers=h).status_code == 404

    assert client.delete(f"/api/admin/users/{admin.id}", headers=h).status_code == 400
    assert client.delete(f"/api/admin/users/{new_id}", headers=h).status_code == 200
    assert client.delete(f"/api/admin/users/{new_id}", headers=h).status_code == 404

    dash = client.get("/api/admin/dashboard", headers=h).json()
    assert dash["total_users"] == 1


def test_admin_property_crud(client, make_user):
    h = auth(make_user(role="admin"))
    r = client.post("/api/admin/properties", json={"title": "Villa", "price": 500000, "type": "villa", "coordinates": {"lat": 37.6, "lng": -0.98}, "location": "Cartagena", "yearBuilt": 2010}, headers=h)
    assert r.status_code == 200
    prop = r.json()
    assert prop["latitude"] == 37.6 and prop["city"] == "Cartagena" and prop["year_built"] == 2010

    r = client.put(f"/api/admin/properties/{prop['id']}", json={"price": 450000, "status": "for-sale"}, headers=h)
    assert r.json()["price"] == 450000 and r.json()["title"] == "Villa"
    assert len(client.get("/api/admin/properties", headers=h).json()) == 1
    assert client.delete(f"/api/admin/properties/{prop['id']}", headers=h).status_code == 200
    assert client.delete(f"/api/admin/properties/{prop['id']}", headers=h).status_code == 404


def test_admin_import_csv(client, make_user):
    h = auth(make_user(role="admin"))
    csv = b"title,price,type,bedrooms,location\nCasa A,100000,casa,3,Lorca\nCasa B,200000,villa,,Murcia\n"
    r = client.post("/api/admin/properties/import", files={"file": ("p.csv", csv, "text/csv")}, headers=h)
    assert r.status_code == 200 and r.json()["properties_added"] == 2
    assert client.post("/api/admin/properties/import", files={"file": ("p.txt", b"x", "text/plain")}, headers=h).status_code == 400


# --- Propiedades del usuario ---

def test_user_property_ownership(client, make_user):
    owner, other = make_user(email="o@example.com"), make_user(email="x@example.com")
    r = client.post("/api/user/properties", json={"title": "Mía", "price": 1000, "type": "piso"}, headers=auth(owner))
    pid = r.json()["id"]
    assert r.json()["status"] == "for-sale"
    assert [p["id"] for p in client.get("/api/user/properties", headers=auth(owner)).json()] == [pid]
    assert client.get("/api/user/properties", headers=auth(other)).json() == []
    assert client.put(f"/api/user/properties/{pid}", json={"price": 1}, headers=auth(other)).status_code == 403
    assert client.put(f"/api/user/properties/{pid}", json={"price": 2000}, headers=auth(owner)).json()["price"] == 2000
    assert client.delete(f"/api/user/properties/{pid}", headers=auth(other)).status_code == 403
    assert client.delete(f"/api/user/properties/{pid}", headers=auth(owner)).status_code == 200
    assert client.delete(f"/api/user/properties/{pid}", headers=auth(owner)).status_code == 404


# --- Favoritos, búsquedas y mensajes ---

def test_favorites(client, make_user, make_property):
    h, prop = auth(make_user()), make_property()
    assert client.post(f"/api/user/favorites/{prop.id}", headers=h).json()["message"] == "Added to favorites"
    assert client.post(f"/api/user/favorites/{prop.id}", headers=h).json()["message"] == "Already in favorites"
    assert [p["id"] for p in client.get("/api/user/favorites", headers=h).json()] == [prop.id]
    client.delete(f"/api/user/favorites/{prop.id}", headers=h)
    assert client.get("/api/user/favorites", headers=h).json() == []


def test_saved_searches(client, make_user):
    user, other = make_user(), make_user(email="o@example.com")
    r = client.post("/api/user/searches", json={"name": "Pisos Murcia", "filters": {"city": "Murcia", "maxPrice": 200000}}, headers=auth(user))
    assert r.status_code == 200
    sid = r.json()["id"]
    searches = client.get("/api/user/searches", headers=auth(user)).json()
    assert len(searches) == 1 and searches[0]["filters"] == {"city": "Murcia", "maxPrice": 200000}
    assert client.get("/api/user/searches", headers=auth(other)).json() == []
    client.delete(f"/api/user/searches/{sid}", headers=auth(other))
    assert len(client.get("/api/user/searches", headers=auth(user)).json()) == 1
    client.delete(f"/api/user/searches/{sid}", headers=auth(user))
    assert client.get("/api/user/searches", headers=auth(user)).json() == []


def test_messages_flow(client, make_user, make_property):
    owner, buyer = make_user(email="o@example.com", full_name="Owner"), make_user(email="b@example.com")
    prop = make_property(owner_id=owner.id)
    r = client.post("/api/user/messages", json={"property_id": prop.id, "content": "¿Sigue disponible?"}, headers=auth(buyer))
    mid = r.json()["id"]
    assert [m["id"] for m in client.get("/api/user/messages", headers=auth(buyer)).json()] == [mid]
    received = client.get("/api/user/messages/received", headers=auth(owner)).json()
    assert received[0]["property_title"] == "Piso en Cartagena"

    assert client.post(f"/api/user/messages/{mid}/reply", json={"content": "Sí"}, headers=auth(owner)).status_code == 200
    assert client.post("/api/user/messages/999/reply", json={"content": "x"}, headers=auth(owner)).status_code == 404
    threads = client.get("/api/user/conversations", headers=auth(buyer)).json()
    assert len(threads) == 1 and len(threads[0]["messages"]) == 2 and threads[0]["unread_count"] == 1
    assert threads[0]["other_user_name"] == "Owner"


# --- Juegos ---

def test_game_scores(client, make_user):
    a, b = make_user(email="ana@example.com", full_name="Ana"), make_user(email="beto@example.com")
    client.post("/api/games/score", json={"game_name": "balance", "score": 50}, headers=auth(a))
    assert client.post("/api/games/score", json={"game_name": "balance", "score": 30}, headers=auth(a)).json()["score"] == 50
    assert client.post("/api/games/score", json={"game_name": "balance", "score": 80}, headers=auth(a)).json()["message"] == "New high score saved!"
    client.post("/api/games/score", json={"game_name": "balance", "score": 60}, headers=auth(b))
    board = client.get("/api/games/balance/leaderboard").json()
    assert [(e["user_name"], e["score"]) for e in board] == [("Ana", 80), ("beto", 60)]
    assert client.post("/api/games/score", json={"game_name": "balance", "score": 1}).status_code == 401


# --- Inmobiliaria e inversor ---

def test_realtor_endpoints(client, make_user, make_property):
    realtor = make_user(role="realtor")
    make_property(realtor_id=realtor.id, price=100000)
    make_property(price=999999)
    dash = client.get("/api/realtor/dashboard", headers=auth(realtor)).json()
    assert dash["total_properties"] == 1 and dash["avg_sale_price"] == 100000
    props = client.get("/api/realtor/properties", headers=auth(realtor))
    assert props.status_code == 200 and len(props.json()) == 1
    assert client.get("/api/realtor/dashboard", headers=auth(make_user(email="u@example.com"))).status_code == 403


def test_investor_endpoints(client, make_user):
    investor = make_user(role="investor")
    assert client.get("/api/investor/dashboard", headers=auth(investor)).status_code == 200
    assert client.get("/api/investor/portfolio", headers=auth(investor)).json() == []


# --- IA ---

def test_ai_chat_fallback_and_conversations(client, make_user):
    user = make_user()
    r = client.post("/api/ai/chat", json={"message": "Busco un piso"}, headers=auth(user))
    assert r.status_code == 200
    body = r.json()
    assert body["provider"] == "mock" and "apartamentos" in body["message"]
    conv_id = body["conversation_id"]

    r = client.post("/api/ai/chat", json={"message": "¿y una villa?", "conversation_id": conv_id, "history": [{"role": "user", "content": "Busco un piso"}]}, headers=auth(user))
    assert r.json()["conversation_id"] == conv_id
    convs = client.get("/api/ai/conversations", headers=auth(user)).json()
    assert len(convs) == 1 and convs[0]["message_count"] == 3
    detail = client.get(f"/api/ai/conversations/{conv_id}", headers=auth(user)).json()
    assert detail["messages"][-1]["role"] == "assistant"
    assert client.get(f"/api/ai/conversations/{conv_id}", headers=auth(make_user(email="z@example.com"))).status_code == 404


def test_ai_chat_guest_has_no_conversation_and_daily_limit(client):
    for _ in range(15):
        r = client.post("/api/ai/chat", json={"message": "hola"})
        assert r.status_code == 200 and r.json()["conversation_id"] is None
    assert client.post("/api/ai/chat", json={"message": "hola"}).status_code == 429


def test_ai_config_admin_only(client, make_user):
    assert client.get("/api/ai/config", headers=auth(make_user())).status_code == 403
    r = client.get("/api/ai/config", headers=auth(make_user(email="a@example.com", role="admin")))
    assert r.status_code == 200 and r.json()["has_api_key"] is False
