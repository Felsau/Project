"""Unit tests สำหรับ pure stat helpers — ไม่แตะ GEE/Supabase
รัน: cd green-area-backend && pytest tests/test_stats_utils.py -v
"""
import pytest

from stats_utils import linregress, mann_kendall


# ── linregress ───────────────────────────────────────────────────────────────
class TestLinregress:
    def test_perfect_positive_line(self):
        fit = linregress([1, 2, 3, 4], [2, 4, 6, 8])  # y = 2x
        assert fit["slope"] == pytest.approx(2.0)
        assert fit["intercept"] == pytest.approx(0.0)
        assert fit["r"] == pytest.approx(1.0)
        assert fit["r2"] == pytest.approx(1.0)
        assert fit["n"] == 4

    def test_perfect_negative_line_is_cooling(self):
        # NDVI สูง → LST ต่ำ (ยิ่งเขียวยิ่งเย็น)
        fit = linregress([0.2, 0.6], [34.0, 28.0])
        assert fit["slope"] < 0
        assert fit["r"] == pytest.approx(-1.0)

    def test_fewer_than_two_points_returns_none(self):
        assert linregress([1], [2]) is None
        assert linregress([], []) is None

    def test_zero_x_variance_returns_none(self):
        # x คงที่ทุกจุด → fit ไม่ได้
        assert linregress([3, 3, 3], [1, 2, 3]) is None

    def test_mismatched_lengths_returns_none(self):
        assert linregress([1, 2, 3], [1, 2]) is None

    def test_constant_y_gives_zero_slope_and_r(self):
        fit = linregress([1, 2, 3], [5, 5, 5])
        assert fit["slope"] == pytest.approx(0.0)
        assert fit["r"] == pytest.approx(0.0)

    def test_r_stays_within_bounds(self):
        fit = linregress([1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8])
        assert -1.0 <= fit["r"] <= 1.0
        assert 0.0 <= fit["r2"] <= 1.0


# ── mann_kendall ─────────────────────────────────────────────────────────────
class TestMannKendall:
    def test_monotonic_increasing_is_significant(self):
        mk = mann_kendall([1, 2, 3, 4, 5, 6, 7, 8])
        assert mk["s"] > 0
        assert mk["tau"] == pytest.approx(1.0)
        assert mk["trend"] == "increasing"
        assert mk["p_value"] < 0.05

    def test_monotonic_decreasing_is_significant(self):
        mk = mann_kendall([8, 7, 6, 5, 4, 3, 2, 1])
        assert mk["s"] < 0
        assert mk["tau"] == pytest.approx(-1.0)
        assert mk["trend"] == "decreasing"
        assert mk["p_value"] < 0.05

    def test_flat_series_has_no_trend(self):
        mk = mann_kendall([5, 5, 5, 5, 5])
        assert mk["s"] == 0
        assert mk["trend"] == "no trend"

    def test_noisy_series_not_significant(self):
        # ขึ้นๆ ลงๆ ไม่มีทิศชัด → ไม่ควรเคลมแนวโน้ม
        mk = mann_kendall([3, 1, 4, 1, 5, 2])
        assert mk["trend"] == "no trend"

    def test_fewer_than_three_points_returns_none(self):
        assert mann_kendall([1, 2]) is None
        assert mann_kendall([1]) is None

    def test_tau_within_bounds(self):
        mk = mann_kendall([1, 3, 2, 4, 5])
        assert -1.0 <= mk["tau"] <= 1.0
        assert mk["n"] == 5

    def test_handles_ties_without_error(self):
        # ค่าซ้ำ (ties) ต้องไม่ทำให้ variance พังหรือ p เกินช่วง
        mk = mann_kendall([2, 2, 3, 3, 4, 4])
        assert 0.0 <= mk["p_value"] <= 1.0
