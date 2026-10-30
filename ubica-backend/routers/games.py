"""Ubica Play: reto diario del Tasador Exprés y puntuaciones de La Torre Fincas, con rankings mensuales."""
import time
from datetime import datetime
from typing import List, Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

import models
from config import ALGORITHM, SECRET_KEY
from database import get_session
from schemas import GameScoreRequest, GameScoreResponse, TasadorGuessRequest
from security import create_access_token, get_current_user, get_user_or_none
from services import games

router = APIRouter()


# ─── Tasador Exprés: reto diario ───────────────────────────────────────────
# Las rutas del tasador van antes que /api/games/{game_name}/leaderboard para que no las capture

@router.get("/api/games/tasador/daily")
async def tasador_daily(user: Optional[models.User] = Depends(get_user_or_none), session: Session = Depends(get_session)):
    """El reto de hoy, sin las respuestas. Con cuenta, también lo que ya has contestado (con su solución)."""
    day = games.today()
    rounds = games.daily_rounds(session, day)
    answered = []
    if user:
        for g in session.exec(select(models.TasadorGuess).where(models.TasadorGuess.user_id == user.id,
                                                                models.TasadorGuess.day == day.isoformat())).all():
            answered.append({"round": g.round_index, **games.reveal(rounds[g.round_index], g.guess)})
    return {
        "day": day.isoformat(),
        "numero": games.challenge_number(day),
        "rondas": [games.public_round(r) for r in rounds],
        "respondidas": sorted(answered, key=lambda a: a["round"]),
        "segundos_para_el_siguiente": games.seconds_until_next(day),
    }


@router.post("/api/games/tasador/daily/guess")
async def tasador_guess(data: TasadorGuessRequest, user: Optional[models.User] = Depends(get_user_or_none), session: Session = Depends(get_session)):
    """Comprueba una respuesta. Con cuenta se guarda y solo cuenta la primera de cada ronda."""
    day = games.today()
    if data.day != day.isoformat():
        raise HTTPException(status_code=409, detail="Ese reto ya ha terminado. Recarga para jugar el de hoy.")
    rounds = games.daily_rounds(session, day)
    if data.round >= len(rounds):
        raise HTTPException(status_code=422, detail="Ronda no válida")
    r = rounds[data.round]
    if not user:
        return games.reveal(r, data.guess)
    existing = session.exec(select(models.TasadorGuess).where(
        models.TasadorGuess.user_id == user.id, models.TasadorGuess.day == data.day, models.TasadorGuess.round_index == data.round)).first()
    if existing:
        return {**games.reveal(r, existing.guess), "ya_respondida": True}
    result = games.reveal(r, data.guess)
    session.add(models.TasadorGuess(user_id=user.id, day=data.day, round_index=data.round, guess=data.guess, points=result["puntos"]))
    try:
        session.commit()
    except IntegrityError:
        # Dos respuestas a la vez para la misma ronda: vale la que llegó primero
        session.rollback()
        first = session.exec(select(models.TasadorGuess).where(
            models.TasadorGuess.user_id == user.id, models.TasadorGuess.day == data.day, models.TasadorGuess.round_index == data.round)).one()
        return {**games.reveal(r, first.guess), "ya_respondida": True}
    return result


@router.get("/api/games/tasador/leaderboard")
async def tasador_leaderboard(limit: int = Query(10, ge=1, le=50), session: Session = Depends(get_session)):
    """Ranking del mes: suma de puntos de los retos jugados con cuenta."""
    return games.month_ranking(session, limit)


# ─── La Torre Fincas ──────────────────────────────────────────────────────

@router.post("/api/games/balance/start")
async def start_balance(current_user: models.User = Depends(get_current_user)):
    """Marca el inicio de una partida: la puntuación final tiene que caber en el tiempo jugado."""
    token = create_access_token({"sub": str(current_user.id), "type": "game", "game": "balance", "started": time.time()}, expires_minutes=180)
    return {"session_token": token}


@router.post("/api/games/score")
async def save_game_score(score_data: GameScoreRequest, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    try:
        payload = jwt.decode(score_data.session_token, SECRET_KEY, algorithms=[ALGORITHM])
        started = float(payload["started"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Partida no válida. Empieza una nueva.")
    if payload.get("type") != "game" or payload.get("game") != score_data.game_name or payload.get("sub") != str(current_user.id):
        raise HTTPException(status_code=422, detail="Partida no válida. Empieza una nueva.")
    if score_data.score > games.balance_max_score(time.time() - started):
        raise HTTPException(status_code=422, detail="Puntuación no válida.")

    # La mejor puntuación de cada jugador en el mes en curso (las de meses anteriores se conservan)
    existing = session.exec(select(models.GameScore).where(
        models.GameScore.user_id == current_user.id,
        models.GameScore.game_name == score_data.game_name,
        models.GameScore.created_at >= games.month_start(),
    )).first()
    if existing:
        if score_data.score > existing.score:
            existing.score = score_data.score
            existing.created_at = datetime.now()
            session.add(existing)
            session.commit()
            return {"message": "New high score saved!", "score": score_data.score}
        return {"message": "Score not higher than existing best.", "score": existing.score}

    session.add(models.GameScore(user_id=current_user.id, game_name=score_data.game_name, score=score_data.score))
    session.commit()
    return {"message": "Score saved successfully!", "score": score_data.score}


@router.get("/api/games/{game_name}/leaderboard", response_model=List[GameScoreResponse])
async def get_leaderboard(game_name: str, limit: int = Query(10, ge=1, le=50), session: Session = Depends(get_session)):
    """Ranking del mes en curso. Se muestra «Nombre I.», nunca el correo."""
    statement = (
        select(models.GameScore, models.User.full_name)
        .join(models.User)
        .where(models.GameScore.game_name == game_name, models.GameScore.created_at >= games.month_start())
        .order_by(models.GameScore.score.desc(), models.GameScore.created_at.asc())
        .limit(limit)
    )
    return [GameScoreResponse(id=s.id, user_id=s.user_id, user_name=games.public_name(full_name, s.user_id),
                              game_name=s.game_name, score=s.score, created_at=s.created_at)
            for s, full_name in session.exec(statement).all()]
