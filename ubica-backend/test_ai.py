import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)

async def test_search():
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        tools=[{"google_search_retrieval": {}}]
    )
    chat = model.start_chat()
    try:
        response = chat.send_message("¿Qué tiempo hace en Murcia hoy?")
        print("Response:", response.text)
    except Exception as e:
        print("Error with dict tool:", e)

    model2 = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        tools=["google_search_retrieval"]
    )
    chat2 = model2.start_chat()
    try:
        response2 = chat2.send_message("¿Qué tiempo hace en Murcia hoy?")
        print("Response 2:", response2.text)
    except Exception as e:
        print("Error with string tool:", e)

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_search())
