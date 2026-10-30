"""Ubica Play: reto diario del Tasador Exprés, puntuaciones de La Torre Fincas y nombres públicos de los rankings."""
import hashlib
import json
import os
import random
from datetime import date, datetime, timedelta
from functools import lru_cache
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

import models
from services.properties import PUBLIC_STATUSES

MADRID = ZoneInfo("Europe/Madrid")
DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "valor_tasado_municipios.json")

# Reto nº 1: el día que se publicó
FIRST_DAY = date(2026, 10, 30)
ROUNDS = 5
MAX_LISTING_ROUNDS = 3

TYPE_LABELS = {
    "villa": "Villa", "apartment": "Apartamento", "flat": "Piso", "house": "Casa", "penthouse": "Ático",
    "townhouse": "Adosado", "studio": "Estudio", "duplex": "Dúplex", "chalet": "Chalet", "land": "Terreno",
}

# La Torre Fincas: como mucho 30 puntos por bloque (perfecto x combo 5 x bloque con logo) y un bloque cada 0,8 s
BALANCE_MAX_POINTS_PER_BLOCK = 30
BALANCE_SECONDS_PER_BLOCK = 0.8
BALANCE_MAX_SCORE = 5000


def today() -> date:
    return datetime.now(MADRID).date()


def month_start() -> datetime:
    """Inicio del mes en curso (hora de Madrid, sin zona, como se guardan las fechas)."""
    now = datetime.now(MADRID)
    return datetime(now.year, now.month, 1)


def public_name(full_name: Optional[str], user_id: int) -> str:
    """Nombre en los rankings: «Ana L.», nunca el correo."""
    parts = (full_name or "").split()
    if not parts:
        return f"Jugador {user_id}"
    return parts[0] if len(parts) == 1 else f"{parts[0]} {parts[1][0].upper()}."


# ─── Tasador Exprés: reto diario ───────────────────────────────────────────

@lru_cache(maxsize=1)
def official_prices() -> dict:
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)


def points_for(guess: float, real: float) -> int:
    """100 si aciertas; se pierden 2 puntos por cada 1 % de error (con un 50 % de error, 0)."""
    error = abs(guess - real) / real * 100
    return max(0, round(100 - 2 * error))


def challenge_number(day: date) -> int:
    return (day - FIRST_DAY).days + 1


def daily_rounds(session: Session, day: date) -> list[dict]:
    """Las 5 rondas del día, iguales para todos. Se guardan la primera vez que se piden y ya no cambian ese día."""
    key = day.isoformat()
    saved = session.get(models.TasadorDay, key)
    if saved:
        return saved.rounds
    rounds = _build_rounds(session, day)
    session.add(models.TasadorDay(day=key, rounds=rounds))
    try:
        session.commit()
    except IntegrityError:
        # Otra petición lo guardó a la vez: vale el suyo
        session.rollback()
        return session.get(models.TasadorDay, key).rounds
    return rounds


def _build_rounds(session: Session, day: date) -> list[dict]:
    """Genera las 5 rondas del día. Cada una con su respuesta en «real» (no se envía al cliente).

    Hasta 3 inmuebles en venta publicados (con precio, metros y foto) y el resto, municipios con su valor
    tasado oficial por m²: la mitad de la Región de Murcia y la otra mitad de toda España."""
    rng = random.Random(int(hashlib.sha256(f"tasador-{day.isoformat()}".encode()).hexdigest(), 16))
    listings = session.exec(select(models.Property).where(
        models.Property.status.in_(PUBLIC_STATUSES), models.Property.status != "for-rent",
        models.Property.price > 0, models.Property.area > 0).order_by(models.Property.id)).all()
    listings = [p for p in listings if p.images]
    picked = rng.sample(listings, min(MAX_LISTING_ROUNDS, len(listings)))
    rounds = [{
        "tipo": "inmueble",
        "inmueble_id": p.id,
        "titulo": p.title,
        "tipo_inmueble": TYPE_LABELS.get(p.type, p.type.capitalize()),
        "ciudad": p.city,
        "habitaciones": p.bedrooms,
        "banos": p.bathrooms,
        "superficie_m2": p.area,
        "fotos": p.images[:5],  # rutas tal cual: la web las sirve en su propio dominio
        "pregunta": "¿Cuánto cuesta este inmueble?",
        "unidad": "€",
        "real": p.price,
    } for p in picked]

    data = official_prices()
    towns = data["municipios"]
    murcia = [t for t in towns if t["provincia"] == "Murcia"]
    rest = [t for t in towns if t["provincia"] != "Murcia"]
    missing = ROUNDS - len(rounds)
    from_murcia = (missing + 1) // 2
    for t in rng.sample(murcia, from_murcia) + rng.sample(rest, missing - from_murcia):
        rounds.append({
            "tipo": "municipio",
            "municipio": t["municipio"],
            "provincia": t["provincia"],
            "pregunta": f"¿Cuánto vale el m² de vivienda en {t['municipio']}?",
            "unidad": "€/m²",
            "fuente": f"Valor tasado medio de vivienda libre, {data['periodo']} (Ministerio de Vivienda y Agenda Urbana)",
            "real": t["eur_m2"],
        })
    rng.shuffle(rounds)
    return rounds


def public_round(r: dict) -> dict:
    """La ronda sin la respuesta ni el id del anuncio (con él se podía consultar el precio antes de contestar)."""
    return {k: v for k, v in r.items() if k not in ("real", "inmueble_id")}


def reveal(r: dict, guess: float) -> dict:
    real = r["real"]
    out = {"real": real, "respuesta": guess, "error_porcentaje": round(abs(guess - real) / real * 100, 1), "puntos": points_for(guess, real)}
    if r["tipo"] == "inmueble":
        out["url"] = f"/inmueble/{r['inmueble_id']}"
    return out


def month_ranking(session: Session, limit: int) -> list[dict]:
    """Suma de puntos del mes por jugador (solo cuentan los retos jugados con cuenta)."""
    start = month_start().date().isoformat()
    guesses = session.exec(select(models.TasadorGuess, models.User.full_name)
                           .join(models.User).where(models.TasadorGuess.day >= start)).all()
    totals: dict[int, dict] = {}
    for g, full_name in guesses:
        t = totals.setdefault(g.user_id, {"user_id": g.user_id, "nombre": public_name(full_name, g.user_id), "puntos": 0, "dias": set(), "first": g.created_at})
        t["puntos"] += g.points
        t["dias"].add(g.day)
        t["first"] = min(t["first"], g.created_at)
    board = sorted(totals.values(), key=lambda t: (-t["puntos"], t["first"]))[:limit]
    return [{"posicion": i + 1, "nombre": t["nombre"], "puntos": t["puntos"], "retos": len(t["dias"])} for i, t in enumerate(board)]


def seconds_until_next(day: date) -> int:
    now = datetime.now(MADRID)
    tomorrow = datetime.combine(day + timedelta(days=1), datetime.min.time(), MADRID)
    return max(0, int((tomorrow - now).total_seconds()))


# ─── La Torre Fincas ──────────────────────────────────────────────────────

def balance_max_score(seconds_played: float) -> int:
    """Lo más que se puede conseguir jugando ese tiempo (más un bloque de margen), con un tope absoluto."""
    blocks = int(max(0.0, seconds_played) / BALANCE_SECONDS_PER_BLOCK) + 1
    return min(BALANCE_MAX_SCORE, blocks * BALANCE_MAX_POINTS_PER_BLOCK)
