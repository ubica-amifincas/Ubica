import re

with open(r"main.py", "r", encoding="utf-8") as f:
    content = f.read()

utils_functions = """
# Utilidades
def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict):
    from datetime import datetime, timedelta
    import jwt
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    import jwt
    from fastapi import HTTPException
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = next((u for u in users_db if u.id == user_id), None)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user.dict())

def require_role(required_roles: list):
    from fastapi import HTTPException
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {required_roles}"
            )
        return current_user
    return role_checker
"""

if "def hash_password" not in content:
    content = content.replace("# Utilidades", utils_functions)

# Now applying save_db()
content = re.sub(r'(users_db\.append\([^)]+\))', r'\1\n    save_db()', content)
content = content.replace('del users_db[idx]', 'del users_db[idx]\n    save_db()')
content = re.sub(r'(properties_db\.append\([^)]+\))', r'\1\n    save_db()', content)
content = content.replace('del properties_db[idx]', 'del properties_db[idx]\n    save_db()')

# Also for PUTs: We look for "u.updated_at = datetime.now()" and "p.updated_at = datetime.now()" 
# Then append "save_db()" except where it's not the endpoint.
content = content.replace('u.updated_at = datetime.now()', 'u.updated_at = datetime.now()\n    save_db()')
content = content.replace('p.updated_at = datetime.now()', 'p.updated_at = datetime.now()\n    save_db()')
content = content.replace('user.updated_at = datetime.now()', 'user.updated_at = datetime.now()\n    save_db()')

# The verify email update modifies user.updated_at too, so my replacement should catch it.

with open(r"main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Restored utils and added save_db()")
