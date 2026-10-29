"""Envío de correos con la API de Resend y plantillas HTML."""
from html import escape
from typing import Any, Dict, List, Optional

import aiohttp

from config import RESEND_API_KEY, RESEND_SENDER

LOGO_URL = "https://ubica.amifincas.es/logo_ubica.png"

async def send_email_resend(email_to: str, subject: str, html: str, reply_to: Optional[str] = None) -> Dict[str, Any]:
    """Envía un correo vía la API de Resend. Sin RESEND_API_KEY (p. ej. en local) solo lo registra."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY no definida; no se envía '{subject}' a {email_to}")
        return {"status": "skipped"}
    try:
        async with aiohttp.ClientSession() as http:
            payload = {"from": f"Ubica <{RESEND_SENDER}>", "to": [email_to], "subject": subject, "html": html}
            if reply_to:
                payload["reply_to"] = reply_to
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

_P = '<p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 25px;">{}</p>'

def _email_layout(title: str, greeting: str, body_html: str, footer_note: str,
                  button_label: Optional[str] = None, link: Optional[str] = None, automatic: bool = True) -> str:
    """Plantilla común (cabecera verde, cuerpo y pie). body_html ya debe venir escapado."""
    button = ""
    if link and button_label:
        safe_link = escape(link)
        button = f"""
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center">
                                            <a href="{safe_link}" style="display: inline-block; padding: 18px 36px; background-color: #4a9d78; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(74, 157, 120, 0.3);">
                                                {escape(button_label)}
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee;">
                                    <p style="font-size: 13px; color: #999; margin-bottom: 10px;">
                                        ¿El botón no funciona? No te preocupes, puedes copiar y pegar este enlace en tu navegador:
                                    </p>
                                    <p style="font-size: 13px; color: #4a9d78;">
                                        <a href="{safe_link}" style="color: #4a9d78; text-decoration: none; word-break: break-all;">{safe_link}</a>
                                    </p>
                                </div>"""
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
                                <img src="{LOGO_URL}" alt="Ubica" style="height: 60px; width: auto; margin-bottom: 20px;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.02em;">{escape(title)}</h1>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 40px 30px 40px;">
                                <h2 style="color: #4a9d78; margin-top: 0; font-size: 20px; font-weight: 700;">{escape(greeting)}</h2>
                                {body_html}{button}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px; background-color: #fafafa; text-align: center;">
                                <p style="font-size: 12px; color: #bbb; line-height: 1.5; margin: 0;">
                                    {"Este es un mensaje automático, por favor no respondas directamente.<br>" if automatic else ""}
                                    &copy; 2024 Ubica Enterprise. Al servicio de la excelencia inmobiliaria.<br>
                                    <span style="color: #ddd;">•</span><br>
                                    {escape(footer_note)}
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

def _paragraphs(*texts: str) -> str:
    return "\n                                ".join(_P.format(t) for t in texts)

def verification_email_html(full_name: Optional[str], verification_link: str) -> str:
    body = _paragraphs(
        "Gracias por unirte a <strong>Ubica Enterprise</strong>. Estamos muy emocionados de tenerte con nosotros para transformar tu experiencia inmobiliaria.",
        "Para activar tu cuenta y comenzar a explorar todas las herramientas, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:",
    )
    return _email_layout("¡Bienvenido a Ubica!", f"Hola {full_name or 'Usuario'},", body,
                         "Si no has solicitado este registro, puedes ignorar este mensaje con seguridad.",
                         "Verificar mi cuenta ahora", verification_link)

def password_reset_email_html(full_name: Optional[str], reset_link: str) -> str:
    body = _paragraphs(
        "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Ubica</strong>.",
        "Pulsa el siguiente botón para elegir una contraseña nueva. El enlace caduca en 60 minutos y solo se puede usar una vez.",
    )
    return _email_layout("Restablece tu contraseña", f"Hola {full_name or 'Usuario'},", body,
                         "Si no has pedido este cambio, ignora este mensaje: tu contraseña actual sigue siendo válida.",
                         "Elegir nueva contraseña", reset_link)

def email_change_email_html(full_name: Optional[str], new_email: str, confirm_link: str) -> str:
    body = _paragraphs(
        f"Has solicitado cambiar el email de tu cuenta en <strong>Ubica</strong> a <strong>{escape(new_email)}</strong>.",
        "Para confirmar el cambio pulsa el siguiente botón. El enlace caduca en 24 horas.",
    )
    return _email_layout("Confirma tu nuevo email", f"Hola {full_name or 'Usuario'},", body,
                         "Si no has solicitado este cambio, ignora este mensaje: tu cuenta no se modificará.",
                         "Confirmar nuevo email", confirm_link)

def contact_email_html(name: str, email: str, phone: Optional[str], subject: Optional[str], message: str) -> str:
    rows: List[str] = []
    for label, value in (("Nombre", name), ("Email", email), ("Teléfono", phone), ("Asunto", subject)):
        if value:
            rows.append(f'<tr><td style="padding: 6px 12px 6px 0; color: #999; font-size: 14px;">{label}</td>'
                        f'<td style="padding: 6px 0; font-size: 14px; color: #333;">{escape(value)}</td></tr>')
    body = (f'<table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">{"".join(rows)}</table>'
            + _P.format(escape(message).replace("\n", "<br>")))
    return _email_layout("Nuevo mensaje de contacto", "Formulario de contacto de Ubica", body,
                         "Responde a este correo para contestar directamente a quien escribió.", automatic=False)
