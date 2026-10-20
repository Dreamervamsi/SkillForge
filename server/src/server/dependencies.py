from .exceptions import GeminiException
from google.genai import Client
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import api_key
from .rate_limiter import RateLimiter
from .auth import verify_token

rate_limiter = RateLimiter(capacity=10, refill_rate=2)
security = HTTPBearer()

client = None
try:
    if api_key and api_key != "your_gemini_api_key_here":
        client = Client(api_key=api_key)
        print("Gemini client initialized successfully")
    else:
        print("WARNING: Gemini API key is missing or not configured. AI features will not work.")
except Exception as e:
    print(f"WARNING: Failed to initialize Gemini client: {str(e)}. AI features will not work.")

def get_client():
    if client is None:
        raise GeminiException("Gemini client is not initialized. Please add your API key to the .env file.")
    return client

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency to verify JWT token and get current user."""
    token = credentials.credentials
    payload = verify_token(token)
    username: str | None = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username