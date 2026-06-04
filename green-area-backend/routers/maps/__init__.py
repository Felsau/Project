"""Maps package — รวม sub-routers (thumbnails + analysis) ภายใต้ router เดียว.

main.py ใช้ `from routers import maps` แล้ว mount `maps.router` — keep API เดิม.
"""
from fastapi import APIRouter

from . import thumbs, analysis

router = APIRouter()
router.include_router(thumbs.router)
router.include_router(analysis.router)
