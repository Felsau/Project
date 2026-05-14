"""Pytest config — เพิ่ม backend root เข้า sys.path เพื่อ import โดยตรง
ตัวอย่าง: from routers.ndvi import _is_stale"""
import os
import sys

# backend root = parent ของ tests/
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)
