import asyncio
import json
from fastapi.testclient import TestClient
from main import app, AI_CONFIG, GEMINI_AVAILABLE, OPENAI_AVAILABLE

client = TestClient(app)

def test_chat():
    print(f"Gemini available: {GEMINI_AVAILABLE}")
    print(f"OpenAI available: {OPENAI_AVAILABLE}")
    print(f"Provider set in config: {AI_CONFIG['provider']}")
    
    payload = {
        "message": "¿Qué propiedades tienes en Lorca por menos de 200000?",
        "history": []
    }
    
    print("\nSending request to /api/ai/chat...")
    response = client.post("/api/ai/chat", json=payload)
    
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response Provider: {data.get('provider')}")
        print(f"Response Model: {data.get('model')}")
        print(f"\nMessage:\n{data.get('message')}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_chat()
