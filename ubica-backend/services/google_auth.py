"""Inicio de sesión con Google: verificación del ID token que entrega Google Identity Services."""
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import GOOGLE_CLIENT_ID

_transport = google_requests.Request()


def verify_google_credential(credential: str) -> dict:
    """Devuelve los datos del token si lo firmó Google para nuestro Client ID; si no, ValueError.

    verify_oauth2_token comprueba la firma con las claves públicas de Google, la audiencia
    (nuestro Client ID), el emisor (accounts.google.com) y la caducidad.
    """
    if not GOOGLE_CLIENT_ID:
        raise ValueError("Google no está configurado")
    info = id_token.verify_oauth2_token(credential, _transport, GOOGLE_CLIENT_ID)
    if not info.get("email") or info.get("email_verified") not in (True, "true"):
        raise ValueError("Google no ha verificado este correo")
    return info
