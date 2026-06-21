"""In-process TTL cache for GEE tile URLs (recommend heatmap) — ลดเวลา cache hit
จาก ~30s → <50ms.

Key: (province, district|None, year) → tile_url · TTL 30 นาที (GEE session token
อยู่ได้หลายชั่วโมง — 30 นาทีปลอดภัย) · max 200 entry (77 จังหวัด × ~5 ปี + districts)
ใช้ TTLCache ที่ thread-safe ร่วมกับ routers/maps/tiles.py (ดู ttl_cache.py)
"""
from ttl_cache import TTLCache

_TILE_URL_TTL = 1800
_TILE_URL_CACHE_MAX = 200
_cache = TTLCache(_TILE_URL_TTL, _TILE_URL_CACHE_MAX)


def get_cached_tile_url(province: str, district: str | None, year: int) -> str | None:
    """คืน tile URL ที่ยังไม่หมดอายุ หรือ None ถ้าต้อง compute ใหม่"""
    return _cache.get((province, district, year))


def store_tile_url(province: str, district: str | None, year: int, url: str) -> None:
    _cache.set((province, district, year), url)
