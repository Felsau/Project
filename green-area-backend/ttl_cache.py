"""Thread-safe in-process TTL cache — size-bounded, lazy expiry.

ใช้ cache GEE tile URL (ผูก session token หมดอายุใน ~ชั่วโมง) ทั้งใน
routers/maps/tiles.py และ routers/recommend/tile_cache.py — เดิมแยกเขียนสองชุด
เหมือนกันเป๊ะ แต่ชุดใน tiles.py ลืม lock ทำให้ check→evict→insert แข่งกันเองใน
threadpool ของ FastAPI (sync endpoint รันหลาย thread) → KeyError / "dict changed
size during iteration" · รวมไว้ที่เดียวมี lock ครอบ mutation ทุกครั้ง

Key เป็น tuple อะไรก็ได้ (hashable) · Value เป็น str (tile URL)
NOTE: cache เป็น per-process — หลาย worker = หลาย cache (tile URL คำนวณซ้ำต่อ worker)
"""
import threading
import time


class TTLCache:
    """In-process cache ที่ entry หมดอายุตาม TTL + จำกัดจำนวน entry สูงสุด.

    - get(): ใช้ dict.get ที่ atomic (GIL) → ไม่ต้อง lock · entry หมดอายุถูกทิ้งแบบ lazy
    - set(): check→evict→insert ไม่ atomic → ครอบด้วย lock เพราะ FastAPI sync
      endpoint รันใน threadpool หลาย thread เรียก set() พร้อมกันได้
    - eviction: เคลียร์ entry ที่หมดอายุก่อน, ถ้ายังเต็มก็ evict อันเก่าสุด (insertion order)
    """

    def __init__(self, ttl_seconds: float, max_size: int):
        self._ttl = ttl_seconds
        self._max_size = max_size
        self._store: dict[tuple, tuple[str, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: tuple) -> str | None:
        """คืน value ที่ยังไม่หมดอายุ หรือ None (ต้อง compute ใหม่)"""
        entry = self._store.get(key)  # dict.get atomic — ไม่ต้อง lock
        if entry and entry[1] > time.time():
            return entry[0]
        return None

    def set(self, key: tuple, value: str) -> None:
        with self._lock:
            # เต็ม — เคลียร์ entry ที่หมดอายุก่อน, ไม่พอก็ evict อันเก่าสุด
            if len(self._store) >= self._max_size:
                now = time.time()
                for k in [k for k, (_, exp) in self._store.items() if exp <= now]:
                    del self._store[k]
                while len(self._store) >= self._max_size:
                    self._store.pop(next(iter(self._store)))
            self._store[key] = (value, time.time() + self._ttl)

    def clear(self) -> None:
        """ล้าง cache ทั้งหมด — ใช้ใน test เพื่อแยก state ระหว่างเคส"""
        with self._lock:
            self._store.clear()
