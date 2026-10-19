from .exceptions import GeminiException
from google.genai import Client
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .config import api_key
from .rate_limiter import RateLimiter
from .auth import verify_token

rate_limiter = RateLimiter(capacity=10, refill_rate=2)
security = HTTPBearer()

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