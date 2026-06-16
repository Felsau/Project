-- ── Migration 008: cache versioning ให้ planting_recommendations ──────────────
-- รันบน Supabase SQL Editor หลัง 007
--
-- /recommend เพิ่ม "plantability mask" (ESA WorldCover v200) ที่ตัดน้ำ/อาคาร/ป่าเดิม/
-- พื้นที่ชุ่มน้ำ ออกจาก plantable area + top_locations → ค่า impact (จำนวนต้น/CO₂) และ
-- top_locations ที่ cache ไว้ "ก่อน" มี mask จะ overestimate (เคยนับพื้นที่ปลูกไม่ได้
-- เป็นพื้นที่ปลูก) · เดิม cache นี้ไม่มี versioning จึงไม่ auto-invalidate
--
-- หลัง migration:
--   • row เก่า (pre-mask)  → cache_version = 0
--   • โค้ดเช็ค `cache_version >= RECOMMEND_CACHE_VERSION (=1)` → row 0 ถือเป็น stale,
--     ลบทิ้งแล้ว recompute ในรอบที่ถูกเรียกครั้งถัดไป (lazy, ไม่ recompute พร้อมกันทั้งหมด)
--   • row ใหม่ที่ app เขียน → cache_version = 1
--
-- DEFAULT ตั้งเป็น 1 หลัง backfill เพื่อให้ row ที่ insert นอก app (ไม่ได้ระบุ column)
-- ถือเป็น current ไม่ค้าง stale

-- 1) เพิ่ม column · DEFAULT 0 ตอนนี้ → row เดิมทุกแถวได้ค่า 0 (pre-mask)
ALTER TABLE planting_recommendations
    ADD COLUMN IF NOT EXISTS cache_version SMALLINT NOT NULL DEFAULT 0;

-- 2) เปลี่ยน default เป็น 1 สำหรับ row ที่จะ insert ต่อจากนี้ (row เดิมยังเป็น 0)
ALTER TABLE planting_recommendations
    ALTER COLUMN cache_version SET DEFAULT 1;

COMMENT ON COLUMN planting_recommendations.cache_version IS
    'เวอร์ชัน compute logic ของ /recommend · ตรงกับ RECOMMEND_CACHE_VERSION ใน dependencies.py · 0 = pre plantability-mask (stale)';
