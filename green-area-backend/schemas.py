"""Pydantic response models — เปิด /docs จะเห็น schema ตรงตามนี้
ใช้กับ openapi-typescript สร้าง type frontend ได้ตรงข้าม API boundary"""
from typing import Optional
from pydantic import BaseModel, Field


# ── NDVI ─────────────────────────────────────────────────────────────────────
class MonthlyNDVIPoint(BaseModel):
    month: str
    month_num: int = Field(ge=1, le=12)
    ndvi: Optional[float] = None
    image_count: Optional[int] = 0


class NDVIResponse(BaseModel):
    province: str
    year: int
    ndvi_mean: Optional[float] = None
    ndvi_min: Optional[float] = None
    ndvi_max: Optional[float] = None
    green_area_pct: Optional[float] = None
    green_area_km2: Optional[float] = None
    dense_area_pct: Optional[float] = None
    dense_area_km2: Optional[float] = None
    total_area_km2: Optional[float] = None
    green_area_m2_per_person: Optional[float] = None
    population: Optional[int] = None
    population_year: Optional[int] = None   # ปีของข้อมูลประชากร — อาจต่างจาก year ถ้า fallback
    who_status: Optional[str] = None
    from_cache: bool


class NDVIMonthlyResponse(BaseModel):
    province: str
    year: int
    monthly: list[MonthlyNDVIPoint]
    from_cache: bool


# ── LST ──────────────────────────────────────────────────────────────────────
class MonthlyLSTPoint(BaseModel):
    month: str
    month_num: int = Field(ge=1, le=12)
    lst: Optional[float] = None
    image_count: Optional[int] = 0


class LSTResponse(BaseModel):
    province: str
    year: int
    lst_mean: Optional[float] = None
    lst_min: Optional[float] = None
    lst_max: Optional[float] = None
    from_cache: bool


class LSTMonthlyResponse(BaseModel):
    province: str
    year: int
    monthly: list[MonthlyLSTPoint]
    from_cache: bool


# ── Ranking ──────────────────────────────────────────────────────────────────
class RankingRow(BaseModel):
    province: str
    rank: int
    ndvi_mean: Optional[float] = None
    green_area_pct: Optional[float] = None
    green_area_km2: Optional[float] = None
    green_area_m2_per_person: Optional[float] = None
    who_status: Optional[str] = None
    population: Optional[int] = None
    total_area_km2: Optional[float] = None
    deficit_m2_per_person: Optional[float] = None
    deficit_km2: Optional[float] = None


class RankingResponse(BaseModel):
    year: int
    total_cached: int
    who_pass_count: int
    who_fail_count: int
    data: list[RankingRow]


# ── Custom area (user-drawn polygon) ─────────────────────────────────────────
class CustomAreaResponse(BaseModel):
    """ผลวิเคราะห์ polygon ที่ผู้ใช้วาดเอง — NDVI/พื้นที่สีเขียว/ประชากร/LST.
    ประชากรมาจาก WorldPop sum ภายในพื้นที่จริง (ไม่ใช่ค่าทั้งจังหวัด)"""
    year: int
    area_km2: float
    ndvi_mean: Optional[float] = None
    ndvi_min: Optional[float] = None
    ndvi_max: Optional[float] = None
    green_area_pct: Optional[float] = None
    green_area_km2: Optional[float] = None
    dense_area_pct: Optional[float] = None
    dense_area_km2: Optional[float] = None
    total_area_km2: Optional[float] = None
    population: Optional[int] = None
    green_area_m2_per_person: Optional[float] = None
    who_status: Optional[str] = None
    lst_mean: Optional[float] = None
    lst_min: Optional[float] = None
    lst_max: Optional[float] = None
    worldpop_year: int


# ── Timelapse ────────────────────────────────────────────────────────────────
class TimelapseResponse(BaseModel):
    """ค่า annual (NDVI หรือ LST) ของทุกจังหวัด ใน range ที่กำหนด — เล่นเป็น
    animation บนแผนที่ · data['Bangkok']['2020'] = 0.42 (อาจ missing บางปีถ้ายัง
    ไม่ compute) · main.py skip row ที่ value เป็น None แล้ว — float เสมอ"""
    start_year: int
    end_year: int
    years: list[int]
    province_count: int
    data: dict[str, dict[str, float]]
