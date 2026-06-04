"""Analysis package — รวม endpoint ย่อย (districts / urban / timeseries / context)
เป็น `router` เดียว เพื่อให้ maps/__init__.py mount ได้เหมือน analysis.py เดิม.
"""
from fastapi import APIRouter

from . import districts, urban, timeseries, context

router = APIRouter()
router.include_router(districts.router)
router.include_router(urban.router)
router.include_router(timeseries.router)
router.include_router(context.router)
