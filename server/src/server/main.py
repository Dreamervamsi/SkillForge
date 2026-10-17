from fastapi import FastAPI
from google.genai import Client, types
from .dependencies import get_client
from .config import system_instruction, GeminiPrompt
from .exceptions import GeminiException

app = FastAPI()

@app.get('/')
def home():
    return {
        "status" :" success"
    }

@app.post('/chat')
def chat(prompt:GeminiPrompt):
    try:
        client = get_client()
        
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
        )

        res = client.models.generate_content(
            model = 'gemini-2.5-flash',
            contents = prompt.prompt,
            config = config
        )

        return {
            "Ai response" : res.text
        }
    except GeminiException as e:
        return {
            "message" : e.message,
            "status" : e.status_code
        }