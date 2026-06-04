"""NDVI package — re-export `router` เพื่อให้ `from routers import ndvi` ทำงานเหมือนเดิม.

Re-export compute helpers ด้วยชื่อเดิม (`_is_stale`, `compute_who_status`)
เพื่อให้ tests ที่ import ตรงจาก `routers.ndvi` ยังทำงานได้.
"""
from .endpoints import router
from .compute import _is_stale, compute_who_status

__all__ = ["router", "_is_stale", "compute_who_status"]
