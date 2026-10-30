"""Ubica Play: reto diario del Tasador Exprés."""
from datetime import date, datetime

import pytest
from sqlmodel import func, select

import models
from conftest import auth
from services import games


@pytest.fixture
def day(monkeypatch):
    d = date(2026, 11, 3)
    monkeypatch.setattr(games, "today", lambda: d)
    return d


def guess(client, round_index, value, user=None, day_str="2026-11-03"):
    return client.post("/api/games/tasador/daily/guess", json={"day": day_str, "round": round_index, "guess": value},
                       headers=auth(user) if user else {})


def test_puntos():
    assert games.points_for(1000, 1000) == 100
    assert games.points_for(1100, 1000) == 80 and games.points_for(900, 1000) == 80
    assert games.points_for(1500, 1000) == 0 and games.points_for(5000, 1000) == 0


def test_nombre_publico():
    assert games.public_name("Ana Pérez García", 7) == "Ana P."
    assert games.public_name("Ana", 7) == "Ana"
    assert games.public_name(None, 7) == games.public_name("  ", 7) == "Jugador 7"


def test_sin_inmuebles_son_municipios_con_datos_oficiales(client, day):
    r = client.get("/api/games/tasador/daily").json()
    assert r["day"] == "2026-11-03" and r["numero"] == 5 and r["respondidas"] == []
    rondas = r["rondas"]
    assert len(rondas) == 5 and all(x["tipo"] == "municipio" and "real" not in x for x in rondas)
    assert sum(x["provincia"] == "Murcia" for x in rondas) == 3
    assert all("Ministerio de Vivienda" in x["fuente"] and x["unidad"] == "€/m²" for x in rondas)
    # El mismo reto para todos durante el día
    assert client.get("/api/games/tasador/daily").json()["rondas"] == rondas


def test_otro_dia_otro_reto(client, monkeypatch):
    monkeypatch.setattr(games, "today", lambda: date(2026, 11, 3))
    a = client.get("/api/games/tasador/daily").json()["rondas"]
    monkeypatch.setattr(games, "today", lambda: date(2026, 11, 4))
    assert client.get("/api/games/tasador/daily").json()["rondas"] != a


def test_inmuebles_publicados_en_venta_con_foto(client, day, make_property):
    ok = [make_property(title=f"Piso {i}", price=100000 + i, area=80, images=["/uploads/a.jpg"]) for i in range(4)]
    make_property(title="Alquiler", status="for-rent", price=800, images=["/a.jpg"])
    make_property(title="Borrador", status="draft", images=["/a.jpg"])
    make_property(title="Sin fotos", images=[])
    rondas = client.get("/api/games/tasador/daily").json()["rondas"]
    pisos = [x for x in rondas if x["tipo"] == "inmueble"]
    assert len(pisos) == 3 and len(rondas) == 5
    # El id (y con él el precio) no se da hasta contestar
    assert all("inmueble_id" not in x for x in rondas)
    idx = next(i for i, x in enumerate(rondas) if x["tipo"] == "inmueble")
    url = client.post("/api/games/tasador/daily/guess", json={"day": "2026-11-03", "round": idx, "guess": 100000}).json()["url"]
    assert int(url.split("/")[-1]) in {p.id for p in ok}
    assert all(x["fotos"][0] == "/uploads/a.jpg" and x["unidad"] == "€" for x in pisos)


def test_responder_sin_cuenta_no_guarda(client, db, day):
    real = games.daily_rounds(db, day)[0]["real"]
    r = guess(client, 0, real * 1.1).json()
    assert r["real"] == real and r["puntos"] == 80 and r["error_porcentaje"] == 10.0
    assert db.exec(select(func.count()).select_from(models.TasadorGuess)).one() == 0


def test_con_cuenta_cuenta_la_primera_respuesta(client, db, day, make_user):
    u = make_user()
    rounds = games.daily_rounds(db, day)
    assert guess(client, 1, rounds[1]["real"], u).json()["puntos"] == 100
    again = guess(client, 1, 1, u).json()
    assert again["ya_respondida"] is True and again["puntos"] == 100
    assert db.exec(select(func.count()).select_from(models.TasadorGuess)).one() == 1
    # Al volver a la página se ve lo ya contestado, con la solución
    respondidas = client.get("/api/games/tasador/daily", headers=auth(u)).json()["respondidas"]
    assert [(a["round"], a["puntos"]) for a in respondidas] == [(1, 100)]


def test_reto_de_otro_dia_o_ronda_inexistente(client, day):
    assert guess(client, 0, 100, day_str="2026-11-02").status_code == 409
    assert guess(client, 5, 100).status_code == 422


def test_ranking_mensual(client, db, day, make_user, monkeypatch):
    ana, beto = make_user(email="ana@example.com", full_name="Ana Pérez"), make_user(email="beto@example.com")
    for u, rnd, pts in ((ana, 0, 90), (ana, 1, 50), (beto, 0, 100)):
        db.add(models.TasadorGuess(user_id=u.id, day="2026-11-03", round_index=rnd, guess=1, points=pts))
    db.add(models.TasadorGuess(user_id=beto.id, day="2026-10-31", round_index=0, guess=1, points=100))  # mes anterior
    db.commit()
    monkeypatch.setattr(games, "month_start", lambda: datetime(2026, 11, 1))
    assert client.get("/api/games/tasador/leaderboard").json() == [
        {"posicion": 1, "nombre": "Ana P.", "puntos": 140, "retos": 1},
        {"posicion": 2, "nombre": f"Jugador {beto.id}", "puntos": 100, "retos": 1}]


def test_la_tabla_nueva_se_crea_al_arrancar():
    from sqlalchemy import inspect
    import database
    models.TasadorGuess.__table__.drop(database.engine)
    assert not inspect(database.engine).has_table("tasadorguess")
    database.ensure_tables()
    assert inspect(database.engine).has_table("tasadorguess")
    database.ensure_tables()  # si ya existe, no hace nada
