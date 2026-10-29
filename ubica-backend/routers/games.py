"""Juegos: guardar puntuaciones y ranking."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

import models
from database import get_session
from schemas import GameScoreRequest, GameScoreResponse
from security import get_current_user

router = APIRouter()

@router.post("/api/games/score")
async def save_game_score(score_data: GameScoreRequest, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Check si hay una puntuación para este usuario y juego
    existing_score = session.exec(select(models.GameScore).where(
        models.GameScore.user_id == current_user.id,
        models.GameScore.game_name == score_data.game_name
    )).first()
    
    if existing_score:
        if score_data.score > existing_score.score:
            existing_score.score = score_data.score
            existing_score.created_at = datetime.now()
            session.add(existing_score)
            session.commit()
            return {"message": "New high score saved!", "score": score_data.score}
        return {"message": "Score not higher than existing best.", "score": existing_score.score}
        
    new_score = models.GameScore(
        user_id=current_user.id,
        game_name=score_data.game_name,
        score=score_data.score
    )
    session.add(new_score)
    session.commit()
    return {"message": "Score saved successfully!", "score": score_data.score}

@router.get("/api/games/{game_name}/leaderboard", response_model=List[GameScoreResponse])
async def get_leaderboard(game_name: str, limit: int = Query(10, ge=1, le=50), session: Session = Depends(get_session)):
    # Join con User para sacar el email o el nombre
    statement = (
        select(models.GameScore, models.User.full_name, models.User.email)
        .join(models.User)
        .where(models.GameScore.game_name == game_name)
        .order_by(models.GameScore.score.desc(), models.GameScore.created_at.asc())
        .limit(limit)
    )
    results = session.exec(statement).all()
    
    leaderboard = []
    for score_obj, full_name, email in results:
        display_name = full_name if full_name else email.split('@')[0]
        leaderboard.append(GameScoreResponse(
            id=score_obj.id,
            user_id=score_obj.user_id,
            user_name=display_name,
            game_name=score_obj.game_name,
            score=score_obj.score,
            created_at=score_obj.created_at
        ))
    return leaderboard
