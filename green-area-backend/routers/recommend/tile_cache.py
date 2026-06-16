"""In-process TTL cache for GEE tile URLs — ลดเวลา cache hit จาก ~30s → <50ms.

Key: (province, district|None, year) → (tile_url, expires_at_unix)
TTL 30 นาที (GEE session token อยู่ได้หลายชั่วโมง — 30 นาทีปลอดภัย)
max size กัน memory โต — 77 จังหวัด × ~5 ปี + districts ~ 200 พอ
"""
import threading
import time

_TILE_URL_TTL = 1800
_TILE_URL_CACHE_MAX = 200
_TILE_URL_CACHE: dict[tuple, tuple[str, float]] = {}
# FastAPI sync endpoints รันใน threadpool → store_tile_url (check→evict→insert)
# ไม่ atomic · lock กัน race (เกิน max หรือ KeyError จาก pop พร้อมกัน)
# NOTE: cache นี้เป็น per-process — หลาย worker = หลาย cache (ดู docstring)
_LOCK = threading.Lock()


def get_cached_tile_url(province: str, district: str | None, year: int) -> str | None:
    """คืน tile URL ที่ยังไม่หมดอายุ หรือ None ถ้าต้อง compute ใหม่"""
    entry = _TILE_URL_CACHE.get((province, district, year))  # dict.get atomic — ไม่ต้อง lock
    if entry and entry[1] > time.time():
        return entry[0]
    return None


def store_tile_url(province: str, district: str | None, year: int, url: str) -> None:
    with _LOCK:
        # ถ้าเต็ม — เคลียร์ entries ที่หมดอายุก่อน, ไม่พอก็ evict อันเก่าสุด (insertion order)
        if len(_TILE_URL_CACHE) >= _TILE_URL_CACHE_MAX:
            now = time.time()
            for k in [k for k, (_, exp) in _TILE_URL_CACHE.items() if exp <= now]:
                del _TILE_URL_CACHE[k]
            while len(_TILE_URL_CACHE) >= _TILE_URL_CACHE_MAX:
                _TILE_URL_CACHE.pop(next(iter(_TILE_URL_CACHE)))
        _TILE_URL_CACHE[(province, district, year)] = (url, time.time() + _TILE_URL_TTL)
