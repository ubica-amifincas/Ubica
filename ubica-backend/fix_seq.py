from sqlmodel import Session, text
from database import engine

with Session(engine) as session:
    session.execute(text("SELECT setval('user_id_seq', (SELECT MAX(id) FROM \"user\"));"))
    session.commit()
    print("Sequence fixed.")
