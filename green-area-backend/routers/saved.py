"""Saved areas — บันทึก polygon ที่ผู้ใช้วาดเอง + ผลวิเคราะห์ ไว้ดูย้อนหลัง/แชร์.

นี่คือ *ข้อมูลผู้ใช้* (ไม่ใช่ cache) → ไม่อยู่ใน CACHE_TABLES, DELETE /cache ไม่แตะ

Ownership แบบเบา (แอปยังไม่มี login):
  - frontend สร้าง UUID เก็บใน localStorage แล้วส่งมาทาง header `X-Owner-Token`
  - GET คืน list แบบ shared (ทุกคนเห็น) พร้อม flag `mine` ที่ตัดสินฝั่ง server
  - DELETE ทำได้เฉพาะเจ้าของ (owner token ตรง) หรือ admin (X-Admin-Token ตรง)
  - response ไม่เคย leak owner_token ออกไป
"""
import logging
import secrets

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

import dependencies  # อ่าน ADMIN_TOKEN แบบ dynamic (รองรับ monkeypatch ใน test)
from dependencies import (supa_call, internal_error, PROVINCE_GEOMETRIES,
                          CURRENT_YEAR, YEAR_MIN, YEAR_MAX)
from polygon_utils import validate_drawn_polygon

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_LABEL_LEN = 120


class SavedAreaCreate(BaseModel):
    """Body ของ POST /saved-areas"""
    geometry: dict = Field(..., description="GeoJSON Polygon geometry")
    year: int = Field(default=CURRENT_YEAR, ge=YEAR_MIN, le=YEAR_MAX)
    label: str | None = Field(default=None, max_length=MAX_LABEL_LEN)
    province: str | None = None
    analysis: dict | None = None        # response ของ /analysis/custom-area
    recommendation: dict | None = None  # response ของ /recommend/custom-area


def _public(row: dict, token: str | None) -> dict:
    """ตัด owner_token ออกจาก response + เติม flag `mine` (เทียบ token ปลอดภัย)"""
    out = {k: v for k, v in row.items() if k != "owner_token"}
    owner = row.get("owner_token")
    out["mine"] = bool(token and owner
                       and secrets.compare_digest(str(owner), str(token)))
    return out


@router.post("/saved-areas")
def create_saved_area(req: SavedAreaCreate,
                      x_owner_token: str | None = Header(default=None)):
    """บันทึกพื้นที่ที่วาด + ผลวิเคราะห์ · owner = X-Owner-Token (ใช้ตัดสินสิทธิ์ลบภายหลัง)"""
    try:
        area_km2 = validate_drawn_polygon(req.geometry)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    province = req.province if req.province in PROVINCE_GEOMETRIES else None
    label = (req.label or "").strip()[:MAX_LABEL_LEN] or None
    row = {
        "label": label, "geometry": req.geometry, "year": req.year,
        "area_km2": round(area_km2, 2), "province": province,
        "analysis": req.analysis, "recommendation": req.recommendation,
        "owner_token": x_owner_token or None,
    }
    try:
        res = supa_call(lambda s: s.table("saved_areas").insert(row).execute())
        saved = res.data[0] if res.data else row
        logger.info("💾 Saved area #%s (%.1f km²)", saved.get("id", "?"), area_km2)
        return _public(saved, x_owner_token)
    except Exception:
        logger.error("❌ Save area error", exc_info=True)
        raise internal_error()


@router.get("/saved-areas")
def list_saved_areas(province: str | None = None,
                     x_owner_token: str | None = Header(default=None)):
    """รายการพื้นที่ที่บันทึก (shared, ใหม่สุดก่อน) — คืน geometry ด้วยเพื่อโหลดกลับบนแผนที่
    แต่ไม่คืน analysis/recommendation ที่หนัก (ดึงเต็มที่ GET /saved-areas/{id})"""
    def _q(s):
        q = (s.table("saved_areas")
             .select("id,label,year,area_km2,province,geometry,owner_token,created_at")
             .order("created_at", desc=True).limit(200))
        if province:
            q = q.eq("province", province)
        return q.execute()
    try:
        res = supa_call(_q)
        return {"data": [_public(r, x_owner_token) for r in res.data]}
    except Exception:
        logger.error("❌ List saved areas error", exc_info=True)
        raise internal_error()


@router.get("/saved-areas/{area_id}")
def get_saved_area(area_id: int, x_owner_token: str | None = Header(default=None)):
    """ดึงพื้นที่ที่บันทึกแบบเต็ม (รวม analysis + recommendation)"""
    res = supa_call(lambda s: s.table("saved_areas").select("*")
                    .eq("id", area_id).execute())
    if not res.data:
        raise HTTPException(status_code=404, detail="ไม่พบพื้นที่ที่บันทึกไว้")
    return _public(res.data[0], x_owner_token)


@router.delete("/saved-areas/{area_id}")
def delete_saved_area(area_id: int,
                      x_owner_token: str | None = Header(default=None),
                      x_admin_token: str | None = Header(default=None)):
    """ลบได้เฉพาะเจ้าของ (owner token ตรง) หรือ admin (admin token ตรง)"""
    res = supa_call(lambda s: s.table("saved_areas").select("id,owner_token")
                    .eq("id", area_id).execute())
    if not res.data:
        raise HTTPException(status_code=404, detail="ไม่พบพื้นที่ที่บันทึกไว้")
    owner = res.data[0].get("owner_token")
    is_owner = bool(x_owner_token and owner
                    and secrets.compare_digest(str(owner), str(x_owner_token)))
    admin = dependencies.ADMIN_TOKEN
    is_admin = bool(admin and x_admin_token
                    and secrets.compare_digest(str(x_admin_token), str(admin)))
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="ลบได้เฉพาะพื้นที่ที่คุณบันทึกเอง")
    supa_call(lambda s: s.table("saved_areas").delete().eq("id", area_id).execute())
    logger.info("🗑️  Deleted saved area #%d (%s)", area_id, "owner" if is_owner else "admin")
    return {"message": "ลบแล้ว", "id": area_id}
