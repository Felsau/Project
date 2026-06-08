-- Migration 004 · ลบ expires_at ที่ไม่เคยถูกใช้จริง
-- รันบน Supabase SQL Editor หลัง 003
--
-- เดิม (migration 002) เพิ่ม expires_at + index มาด้วยเจตนา "backend จะลบ row ตาม TTL
-- อัตโนมัติ" แต่สุดท้าย tile URL ย้ายไปใช้ in-process TTL cache
-- (routers/recommend/tile_cache.py) และเลิกเก็บ tile_url ลง DB แล้ว
-- → expires_at + index กลายเป็น dead schema ที่ไม่มีโค้ดอ่าน/เขียน

DROP INDEX IF EXISTS idx_planting_expires;
ALTER TABLE planting_recommendations DROP COLUMN IF EXISTS expires_at;
