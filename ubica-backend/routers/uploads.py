"""Subida de imágenes (requiere login)."""
import os
import shutil
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

import models
from config import UPLOAD_DIR
from security import get_current_user

router = APIRouter()

@router.post("/api/upload-images")
async def upload_images(files: List[UploadFile] = File(...), current_user: models.User = Depends(get_current_user)):
    uploaded_urls = []
    base_url = "http://localhost:8000/uploads" # Idealmente esto vendría de una variable de entorno

    for file in files:
        # Generar nombre único
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: {ext or 'sin extensión'}")
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        uploaded_urls.append(f"{base_url}/{unique_filename}")
        
    return {"urls": uploaded_urls}
