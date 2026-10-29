"""Envío de correos con la API de Resend."""
from typing import Any, Dict, Optional

import aiohttp

from config import RESEND_API_KEY, RESEND_SENDER

LOGO_URL = "https://ubica.amifincas.es/logo_ubica.png"

async def send_email_resend(email_to: str, subject: str, html: str) -> Dict[str, Any]:
    """Envía un correo vía la API de Resend. Sin RESEND_API_KEY (p. ej. en local) solo lo registra."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY no definida; no se envía '{subject}' a {email_to}")
        return {"status": "skipped"}
    try:
        async with aiohttp.ClientSession() as http:
            payload = {"from": f"Ubica <{RESEND_SENDER}>", "to": [email_to], "subject": subject, "html": html}
            headers = {"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"}
            async with http.post("https://api.resend.com/emails", json=payload, headers=headers) as resp:
                result = await resp.json()
                if resp.status in [200, 201]:
                    print(f"[email] Enviado '{subject}' a {email_to}")
                    return {"status": "success", "id": result.get("id")}
                print(f"[email] Error de Resend al enviar a {email_to}: {result}")
                return {"status": "error", "message": f"Error API Resend: {result}"}
    except Exception as e:
        print(f"[email] Error al enviar a {email_to}: {e}")
        return {"status": "error", "message": str(e)}

def verification_email_html(full_name: Optional[str], verification_link: str) -> str:
    logo_url = LOGO_URL
    return f"""<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body {{ font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f7f5; color: #333;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f5; padding: 20px 0;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 0; text-align: center; background: linear-gradient(135deg, #4a9d78 0%, #3a8d68 100%);">
                                <img src="{logo_url}" alt="Ubica" style="height: 60px; width: auto; margin-bottom: 20px;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em;">¡Bienvenido a Ubica!</h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 40px 30px 40px;">
                                <h2 style="color: #4a9d78; margin-top: 0; font-size: 20px; font-weight: 700;">Hola {full_name or 'Usuario'},</h2>
                                <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 25px;">
                                    Gracias por unirte a <strong>Ubica Enterprise</strong>. Estamos muy emocionados de tenerte con nosotros para transformar tu experiencia inmobiliaria.
                                </p>
                                <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 30px;">
                                    Para activar tu cuenta y comenzar a explorar todas las herramientas, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:
                                </p>

                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center">
                                            <a href="{verification_link}" style="display: inline-block; padding: 18px 36px; background-color: #4a9d78; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(74, 157, 120, 0.3);">
                                                Verificar mi cuenta ahora
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee;">
                                    <p style="font-size: 13px; color: #999; margin-bottom: 10px;">
                                        ¿El botón no funciona? No te preocupes, puedes copiar y pegar este enlace en tu navegador:
                                    </p>
                                    <p style="font-size: 13px; color: #4a9d78;">
                                        <a href="{verification_link}" style="color: #4a9d78; text-decoration: none; word-break: break-all;">{verification_link}</a>
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px; background-color: #fafafa; text-align: center;">
                                <p style="font-size: 12px; color: #bbb; line-height: 1.5; margin: 0;">
                                    Este es un mensaje automático, por favor no respondas directamente.<br>
                                    &copy; 2024 Ubica Enterprise. Al servicio de la excelencia inmobiliaria.<br>
                                    <span style="color: #ddd;">•</span><br>
                                    Si no has solicitado este registro, puedes ignorar este mensaje con seguridad.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
