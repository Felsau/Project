"""Per-key lock — กัน cache stampede ของ compute หนัก (GEE).

เมื่อหลาย request ขอ resource เดียวกันที่ยังไม่ cache พร้อมกัน (ผู้ใช้คลิกรัวๆ หรือ
หลายคนเปิดจังหวัด/อำเภอเดียวกัน) ถ้าไม่ล็อก ทุก request จะยิง GEE compute (30–60s)
ซ้ำกันทั้งที่ผลเหมือนกัน — เปลือง quota + ช้า · KeyedLock ให้ request ของ "key เดียวกัน"
ทำทีละตัว: ตัวแรก compute+cache, ตัวที่รอคิวจะเจอ cache ที่ตัวแรกเขียนไว้ (ผ่านการ
re-check หลังได้ lock) แล้วคืนเลยโดยไม่ compute ซ้ำ · key ต่างกันไม่บล็อกกัน

Thread-safe สำหรับ FastAPI sync endpoint ที่รันใน threadpool หลาย thread · lock ที่
ไม่มีคนถือถูกเก็บกวาด (refcount = 0 → ลบทิ้ง) กัน dict โตไม่จำกัด · per-process
เหมือน TTLCache — หลาย worker = หลาย registry (กัน stampede ภายใน worker เดียว ซึ่ง
ครอบ case จริงส่วนใหญ่ที่ thread ของ worker เดียวกันชนกัน)
"""
import threading
from contextlib import contextmanager


class KeyedLock:
    """ออก lock แยกต่อ key — สร้าง lazy, เก็บกวาดเมื่อไม่มีคนถือ.

    ใช้ผ่าน context manager:  with COMPUTE_LOCK.hold(key): ...
    """

    def __init__(self):
        # key -> [lock, holders] · holders = จำนวน thread ที่ถือ/รอ lock นี้อยู่
        self._locks: dict = {}
        self._guard = threading.Lock()

    @contextmanager
    def hold(self, key):
        # ลงทะเบียน/อ้างถึง lock ของ key นี้ (guard ครอบ mutation ของ registry)
        with self._guard:
            entry = self._locks.get(key)
            if entry is None:
                entry = [threading.Lock(), 0]
                self._locks[key] = entry
            entry[1] += 1
            lock = entry[0]
        lock.acquire()
        try:
            yield
        finally:
            lock.release()
            # คืน ref แล้วเก็บกวาดถ้าไม่มีคนถือเหลือ
            with self._guard:
                entry = self._locks.get(key)
                if entry is not None:
                    entry[1] -= 1
                    if entry[1] <= 0:
                        del self._locks[key]


# Registry กลางสำหรับ compute หนัก (GEE) ทั้งแอป — import ตัวนี้ไปใช้ที่ endpoint
COMPUTE_LOCK = KeyedLock()
