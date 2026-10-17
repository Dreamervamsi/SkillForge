from .exceptions import GeminiException
from google.genai import Client
from .config import api_key

try:
    if api_key:
        client = Client(api_key=api_key)
    else:
        print("Api key is missing")
        raise GeminiException("Api key is missing")
except Exception as e:
    raise GeminiException(str(e))

def get_client():
    return client