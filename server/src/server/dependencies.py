from .exceptions import GeminiException
from google.genai import Client
from fastapi import HTTPException, status, Request
from .config import api_key
from .rate_limiter import RateLimiter

rate_limiter = RateLimiter(capacity=10, refill_rate=2)

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

async def check_rate_limit(request: Request):
    client_ip = request.client.host
    allowed = await rate_limiter.allow_request(client_ip)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate Limit exceeded. Please try again later"
        )