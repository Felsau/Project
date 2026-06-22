"""Unit tests สำหรับ KeyedLock (กัน cache stampede)
รัน: cd green-area-backend && pytest tests/test_keyed_lock.py -v
"""
import threading
import time

from keyed_lock import KeyedLock


class TestKeyedLock:
    def test_same_key_serializes(self):
        """thread ที่ถือ key เดียวกันต้องไม่ทับช่วงกัน (mutual exclusion)"""
        kl = KeyedLock()
        active = 0
        max_active = 0
        lock = threading.Lock()

        def worker():
            nonlocal active, max_active
            with kl.hold("same"):
                with lock:
                    active += 1
                    max_active = max(max_active, active)
                time.sleep(0.02)   # ถือ lock ไว้สักครู่ให้ thread อื่นมีโอกาสทับ
                with lock:
                    active -= 1

        threads = [threading.Thread(target=worker) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert max_active == 1   # ไม่มีช่วงที่ 2 thread ถือ key เดียวกันพร้อมกัน

    def test_different_keys_run_concurrently(self):
        """key ต่างกันต้องรันขนานได้ (ไม่บล็อกกัน) — ไม่ deadlock"""
        kl = KeyedLock()
        overlap_seen = threading.Event()
        active = 0
        lock = threading.Lock()

        def worker(key):
            nonlocal active
            with kl.hold(key):
                with lock:
                    active += 1
                    if active >= 2:
                        overlap_seen.set()
                time.sleep(0.05)
                with lock:
                    active -= 1

        threads = [threading.Thread(target=worker, args=(f"k{i}",)) for i in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert overlap_seen.is_set()   # 2 key พร้อมกันได้จริง

    def test_locks_reaped_after_release(self):
        """lock ที่ปล่อยแล้วต้องถูกลบออกจาก registry (ไม่รั่ว)"""
        kl = KeyedLock()
        with kl.hold(("ndvi", "Bangkok", 2024)):
            assert len(kl._locks) == 1
        assert len(kl._locks) == 0

    def test_reentrant_keys_independent(self):
        """ถือหลาย key ซ้อนกันได้ แล้วเก็บกวาดครบเมื่อออก"""
        kl = KeyedLock()
        with kl.hold("a"):
            with kl.hold("b"):
                assert len(kl._locks) == 2
        assert len(kl._locks) == 0

    def test_exception_releases_and_reaps(self):
        """exception ภายใน with ต้องปล่อย lock + เก็บกวาด (finally)"""
        kl = KeyedLock()
        try:
            with kl.hold("boom"):
                raise ValueError("x")
        except ValueError:
            pass
        assert len(kl._locks) == 0
        # ถ้าไม่ปล่อย lock จริง รอบนี้จะ deadlock/ค้าง — เข้าได้ = ปล่อยแล้ว
        with kl.hold("boom"):
            pass
