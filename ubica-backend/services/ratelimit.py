"""Límites de peticiones en memoria (por proceso) e IP real del cliente detrás de proxies."""
import threading
import time
from collections import deque
from typing import Deque, Dict, List

from fastapi import Request

_limiters: List["RateLimiter"] = []


class RateLimiter:
    """Ventana deslizante: como mucho max_hits eventos por clave en window_seconds."""

    def __init__(self, max_hits: int, window_seconds: int):
        self.max_hits = max_hits
        self.window = window_seconds
        self._hits: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()
        _limiters.append(self)

    def _recent(self, key: str, now: float) -> Deque[float]:
        hits = self._hits.get(key)
        if hits is None:
            return deque()
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if not hits:
            del self._hits[key]
        return hits

    def is_limited(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key, time.monotonic())) >= self.max_hits

    def hit(self, key: str) -> None:
        with self._lock:
            now = time.monotonic()
            # Limpieza ocasional de claves caducadas para no crecer sin límite
            if len(self._hits) > 10_000:
                for k in list(self._hits):
                    self._recent(k, now)
            self._recent(key, now)
            self._hits.setdefault(key, deque()).append(now)

    def check_and_hit(self, key: str) -> bool:
        """Registra el evento si queda cupo; devuelve False si ya se había alcanzado el límite."""
        with self._lock:
            now = time.monotonic()
            hits = self._recent(key, now)
            if len(hits) >= self.max_hits:
                return False
            self._hits.setdefault(key, hits).append(now)
            return True

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


def reset_all_limiters() -> None:
    for limiter in _limiters:
        limiter.clear()


def get_client_ip(request: Request) -> str:
    """IP del cliente: Cloudflare y Render ponen la original en estas cabeceras."""
    for header in ("cf-connecting-ip", "true-client-ip"):
        value = request.headers.get(header, "").strip()
        if value:
            return value
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.client.host if request.client else "unknown"
