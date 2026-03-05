import os
from dotenv import load_dotenv

load_dotenv()

from database import engine
from sqlmodel import Session, select
import models
from main import Token, create_access_token

def test():
    with Session(engine) as session:
        user = session.exec(select(models.User).where(models.User.email == 'admin@amifincas.es')).first()
        token = create_access_token({'sub': user.id})
        
        try:
            # This is what FastAPI does under the hood for response_model=Token
            response_data = Token(
                access_token=token,
                token_type="bearer",
                expires_in=3600,
                user=user
            )
            print("Serialization successful:", response_data.model_dump() if hasattr(response_data, "model_dump") else response_data.dict())
        except Exception as e:
            import traceback
            traceback.print_exc()

test()
