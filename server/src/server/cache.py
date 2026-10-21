import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class SkillGraphCache:
    """In-memory cache for skill graphs with TTL support."""

    def __init__(self, default_ttl_hours: int = 24):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = timedelta(hours=default_ttl_hours)

    def _generate_cache_key(self, domain: str, goal: str) -> str:
        """Generate a unique cache key based on domain and goal."""
        key_string = f"{domain}:{goal}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def get(self, domain: str, goal: str) -> Optional[Dict[str, Any]]:
        """Retrieve skill graph from cache if available and not expired."""
        cache_key = self._generate_cache_key(domain, goal)

        if cache_key not in self.cache:
            return None

        cached_item = self.cache[cache_key]

        # Check if cache entry has expired
        if datetime.now() > cached_item['expires_at']:
            del self.cache[cache_key]
            return None

        print(f"DEBUG: Cache HIT for key: {cache_key}")
        return cached_item['data']

    def set(self, domain: str, goal: str, skill_graph: Any, ttl_hours: Optional[int] = None) -> None:
        """Store skill graph in cache with TTL."""
        cache_key = self._generate_cache_key(domain, goal)
        ttl = timedelta(hours=ttl_hours) if ttl_hours else self.default_ttl
        expires_at = datetime.now() + ttl

        # Convert skill graph to dict if it's an object
        if hasattr(skill_graph, 'to_dict'):
            data = skill_graph.to_dict()
        else:
            data = skill_graph

        self.cache[cache_key] = {
            'data': data,
            'expires_at': expires_at,
            'created_at': datetime.now()
        }

        print(f"DEBUG: Cache SET for key: {cache_key}, expires: {expires_at}")

    def clear(self) -> None:
        """Clear all cache entries."""
        self.cache.clear()
        print("DEBUG: Cache cleared")

    def clear_expired(self) -> int:
        """Remove expired entries and return count of removed items."""
        now = datetime.now()
        expired_keys = [
            key for key, item in self.cache.items()
            if now > item['expires_at']
        ]

        for key in expired_keys:
            del self.cache[key]

        if expired_keys:
            print(f"DEBUG: Cleared {len(expired_keys)} expired cache entries")

        return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        now = datetime.now()
        active_entries = sum(1 for item in self.cache.values() if now <= item['expires_at'])
        expired_entries = len(self.cache) - active_entries

        return {
            'total_entries': len(self.cache),
            'active_entries': active_entries,
            'expired_entries': expired_entries,
            'cache_keys': list(self.cache.keys())
        }

# Global cache instance
skill_graph_cache = SkillGraphCache(default_ttl_hours=24)
