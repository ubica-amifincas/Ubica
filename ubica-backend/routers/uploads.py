"""Subida de imágenes (requiere login): a Supabase Storage si está configurado, si no al disco local."""
import os
import uuid
from typing import List

import aiohttp
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

import models
from config import BACKEND_PUBLIC_URL, MAX_UPLOAD_BYTES, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, SUPABASE_URL, UPLOAD_DIR
from security import get_current_user

router = APIRouter()

CONTENT_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}

def _looks_like_image(data: bytes) -> bool:
    return (data.startswith(b"\x89PNG") or data.startswith(b"\xff\xd8\xff") or data.startswith(b"GIF8")
            or (data[:4] == b"RIFF" and data[8:12] == b"WEBP"))

async def _store_in_supabase(name: str, data: bytes, content_type: str) -> str:
    url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{name}"
    headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}", "Content-Type": content_type}
    async with aiohttp.ClientSession() as http:
        async with http.post(url, data=data, headers=headers) as resp:
            if resp.status >= 300:
                print(f"Supabase Storage error {resp.status}: {await resp.text()}")
                raise HTTPException(status_code=502, detail="No se pudo guardar la imagen")
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}/{name}"

@router.post("/api/upload-images")
async def upload_images(request: Request, files: List[UploadFile] = File(...), current_user: models.User = Depends(get_current_user)):
    # Se valida todo antes de guardar nada
    pending = []
    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in CONTENT_TYPES:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: {ext or 'sin extensión'}")
        data = await file.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Cada imagen puede ocupar como máximo 5 MB")
        if not _looks_like_image(data):
            raise HTTPException(status_code=400, detail=f"{file.filename} no es una imagen válida")
        pending.append((f"{uuid.uuid4()}{ext}", data, CONTENT_TYPES[ext]))

    uploaded_urls = []
    for name, data, content_type in pending:
        if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
            uploaded_urls.append(await _store_in_supabase(name, data, content_type))
        else:
            with open(os.path.join(UPLOAD_DIR, name), "wb") as buffer:
                buffer.write(data)
            base_url = (BACKEND_PUBLIC_URL or str(request.base_url)).rstrip("/")
            uploaded_urls.append(f"{base_url}/uploads/{name}")
        
    return {"urls": uploaded_urls}
