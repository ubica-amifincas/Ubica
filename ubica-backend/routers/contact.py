"""Formulario de contacto público: reenvía el mensaje por email al buzón de la empresa."""
from fastapi import APIRouter, HTTPException, Request

from config import CONTACT_EMAIL
from schemas import ContactRequest
from services.email import contact_email_html, send_email_resend
from services.ratelimit import RateLimiter, get_client_ip

router = APIRouter()

contact_limiter = RateLimiter(5, 60 * 60)

@router.post("/api/contact")
async def send_contact(data: ContactRequest, request: Request):
    if not contact_limiter.check_and_hit(get_client_ip(request)):
        raise HTTPException(status_code=429, detail="Has enviado demasiados mensajes. Inténtalo de nuevo más tarde.")
    origin = "AMI Fincas" if data.source == "ami" else "Contacto Ubica"
    subject = f"[{origin}] {data.subject or 'Nuevo mensaje'} - {data.name}"
    html = contact_email_html(data.name, data.email, data.phone, data.subject, data.message)
    # Se espera al envío: si Resend falla, el usuario debe saber que el mensaje no ha llegado
    result = await send_email_resend(CONTACT_EMAIL, subject, html, reply_to=data.email)
    if result.get("status") == "error":
        raise HTTPException(status_code=502, detail="No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.")
    return {"message": "Mensaje enviado. Te responderemos lo antes posible."}
