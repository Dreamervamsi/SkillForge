from typing import Dict
import time
import asyncio

class RateLimiter:
    def __init__(self, capacity: int = 10, refill_rate:int = 2):
        self.capacity = capacity
        self.refill_rate = refill_rate
        # implemeting per-client rate limiter mechanism instead of global rate limiter
        self.buckets: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
    
    def _cleanup_stale_buckets(self, now: float):
        stale_ips = [
            ip for ip, bucket in self.buckets.items()
            if now - bucket['last_refill'] > 3600
        ]
        for ip in stale_ips:
            del self.buckets[ip]

    async def allow_request(self, client_ip: str) -> bool:
        # implement async locking to reduc concurrency problem
        async with self._lock:
            now = time.time()
            self._cleanup_stale_buckets(now)

            if client_ip not in self.buckets:
                self.buckets[client_ip] = {
                    'tokens': self.capacity,
                    'last_refill': now
                }
            bucket = self.buckets[client_ip]
            elapsed = now - bucket['last_refill']
            earned_tokens = elapsed * self.refill_rate

            # Implementing CAP(capacity) mechanism
            bucket['tokens'] = min(self.capacity, bucket['tokens'] + earned_tokens)
        
            if bucket['tokens'] >= 1:
                bucket['tokens'] -= 1
                bucket['last_refill'] = now
                return True
            return False