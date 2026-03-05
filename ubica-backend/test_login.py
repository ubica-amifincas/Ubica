import os
from dotenv import load_dotenv

load_dotenv()

from database import engine
from sqlmodel import Session, select
import models
from main import verify_password, create_access_token

def test():
    with Session(engine) as session:
        user = session.exec(select(models.User).where(models.User.email == 'admin@amifincas.es')).first()
        if not user:
            print("User not found")
            return
            
        print("User found:", user.email)
        print("Is verified:", user.is_verified)
        print("Pass OK?", verify_password('admin123', user.hashed_password))
        
        try:
            token = create_access_token({'sub': user.id})
            print("Token generated successfully")
        except Exception as e:
            print("Token error:", str(e))

test()
