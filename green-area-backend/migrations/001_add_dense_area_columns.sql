-- Migration 001 · เพิ่ม column dense forest (NDVI > 0.5) ลงตาราง NDVI cache
-- รันบน Supabase SQL Editor ครั้งเดียวก่อน deploy เวอร์ชันใหม่
-- เหตุผล: ตอน compute NDVI annual จะคำนวณ dense_area_pct/km2 ด้วย
-- แต่ schema เดิมไม่มี column นี้ทำให้ insert ล้มเหลว/ตกหล่น

ALTER TABLE ndvi_annual          ADD COLUMN IF NOT EXISTS dense_area_pct FLOAT;
ALTER TABLE ndvi_annual          ADD COLUMN IF NOT EXISTS dense_area_km2 FLOAT;
ALTER TABLE district_ndvi_annual ADD COLUMN IF NOT EXISTS dense_area_pct FLOAT;
ALTER TABLE district_ndvi_annual ADD COLUMN IF NOT EXISTS dense_area_km2 FLOAT;
