"""Unit tests สำหรับ pure helpers ที่ไม่ต้องพึ่ง GEE/Supabase
รัน: cd green-area-backend && pytest tests/ -v
"""
import pytest

# Import จาก backend modules — conftest.py ตั้ง sys.path ให้แล้ว
from routers.ndvi import _is_stale, compute_who_status
from routers.recommend import _normalize_weights, W_NDVI, W_LST, W_POP


# ── _is_stale ────────────────────────────────────────────────────────────────
class TestIsStale:
    def test_complete_modern_row_not_stale(self):
        row = {"green_area_pct": 35.2, "total_area_km2": 1234, "ndvi_min": 0.05}
        assert _is_stale(row) is False

    def test_missing_green_area_pct_is_stale(self):
        row = {"green_area_pct": None, "total_area_km2": 1234, "ndvi_min": 0.05}
        assert _is_stale(row) is True

    def test_missing_total_area_km2_is_stale(self):
        row = {"green_area_pct": 35, "total_area_km2": None, "ndvi_min": 0.05}
        assert _is_stale(row) is True

    def test_negative_ndvi_min_is_stale(self):
        # ndvi_min < -0.05 = cache เก่าก่อนยุค water mask
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": -0.2}
        assert _is_stale(row) is True

    def test_ndvi_min_at_boundary_not_stale(self):
        # ndvi_min = -0.05 พอดี → ไม่ stale (เงื่อนไขเป็น <)
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": -0.05}
        assert _is_stale(row) is False

    def test_ndvi_min_none_handled(self):
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": None}
        assert _is_stale(row) is False


# ── compute_who_status ────────────────────────────────────────────────────────
class TestComputeWhoStatus:
    def test_pass_when_above_9_m2_per_person(self):
        # 100m² × 1M people = 0.1 m²/คน · ต้องลอง pop น้อย
        # 100_000_000 m² / 1_000_000 = 100 m²/คน → ผ่าน
        m2pp, status = compute_who_status(green_area_m2=100_000_000, population=1_000_000)
        assert m2pp == 100.0
        assert "ผ่านมาตรฐาน" in status

    def test_fail_when_below_9_m2_per_person(self):
        # 5_000_000 m² / 1_000_000 = 5 m²/คน → ต่ำกว่า
        m2pp, status = compute_who_status(green_area_m2=5_000_000, population=1_000_000)
        assert m2pp == 5.0
        assert "ต่ำกว่ามาตรฐาน" in status

    def test_at_exact_9_threshold_passes(self):
        m2pp, status = compute_who_status(green_area_m2=9_000_000, population=1_000_000)
        assert m2pp == 9.0
        assert "ผ่าน" in status

    def test_zero_population_returns_none(self):
        m2pp, status = compute_who_status(green_area_m2=1000, population=0)
        assert m2pp is None
        assert status is None

    def test_none_population_returns_none(self):
        m2pp, status = compute_who_status(green_area_m2=1000, population=None)
        assert m2pp is None
        assert status is None

    def test_none_green_area_returns_none(self):
        m2pp, status = compute_who_status(green_area_m2=None, population=1000)
        assert m2pp is None
        assert status is None


# ── _normalize_weights ────────────────────────────────────────────────────────
class TestNormalizeWeights:
    def test_default_weights_pass_through(self):
        n, l, p = _normalize_weights(W_NDVI, W_LST, W_POP)
        assert (n, l, p) == (W_NDVI, W_LST, W_POP)

    def test_normalize_to_sum_one(self):
        n, l, p = _normalize_weights(0.6, 0.4, 0.0)
        assert abs(n + l + p - 1.0) < 1e-9
        assert n == pytest.approx(0.6)
        assert l == pytest.approx(0.4)
        assert p == pytest.approx(0.0)

    def test_normalize_oversize_weights(self):
        # 2.0 + 2.0 + 1.0 = 5.0 → normalize เป็น 0.4, 0.4, 0.2
        n, l, p = _normalize_weights(2.0, 2.0, 1.0)
        assert n == pytest.approx(0.4)
        assert l == pytest.approx(0.4)
        assert p == pytest.approx(0.2)

    def test_zero_total_falls_back_to_default(self):
        n, l, p = _normalize_weights(0, 0, 0)
        assert (n, l, p) == (W_NDVI, W_LST, W_POP)

    def test_negative_total_falls_back_to_default(self):
        n, l, p = _normalize_weights(-0.1, -0.1, -0.1)
        assert (n, l, p) == (W_NDVI, W_LST, W_POP)
