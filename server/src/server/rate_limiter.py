from pydantic import BaseModel

class RateLimiter(BaseModel):
    capacity: int = 10
    refill_rate: int = 2
    last_refill: float
    tokens:int

    def allow_request(self):
        if self.tokens > 0:
            self.tokens-=1