"""Unit tests สำหรับ pure helpers ที่ไม่ต้องพึ่ง GEE/Supabase
รัน: cd green-area-backend && pytest tests/ -v
"""
import os
import tempfile

import pytest

# Import จาก backend modules — conftest.py ตั้ง sys.path ให้แล้ว
from routers.ndvi import _is_stale, compute_who_status
from routers.recommend import _normalize_weights, W_NDVI, W_LST, W_POP
from dependencies import _validate_geojson_path, CURRENT_CACHE_VERSION
from impact import estimate_impact, IMPACT_DEFAULTS, TREE_CO2_PER_YEAR


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

    def test_old_cache_version_is_stale(self):
        # cache_version < CURRENT_CACHE_VERSION → stale แม้ field อื่นจะครบ
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": 0.05,
               "cache_version": CURRENT_CACHE_VERSION - 1}
        assert _is_stale(row) is True

    def test_current_cache_version_not_stale(self):
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": 0.05,
               "cache_version": CURRENT_CACHE_VERSION}
        assert _is_stale(row) is False

    def test_missing_cache_version_treated_as_1(self):
        # row จาก legacy schema (ไม่มี cache_version column) — default = 1
        # ถ้า CURRENT_CACHE_VERSION = 1 → ไม่ stale
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": 0.05}
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


# ── _validate_geojson_path ────────────────────────────────────────────────────
class TestValidateGeojsonPath:
    def test_valid_json_file_passes(self, tmp_path):
        p = tmp_path / "test.json"
        p.write_text('{"type":"FeatureCollection","features":[]}', encoding='utf-8')
        result = _validate_geojson_path(str(p))
        assert os.path.isfile(result)
        assert result.lower().endswith('.json')

    def test_nonexistent_file_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            _validate_geojson_path(str(tmp_path / "missing.json"))

    def test_non_json_extension_raises(self, tmp_path):
        # ป้องกัน path traversal ที่ชี้ไปไฟล์ผิดประเภท เช่น /etc/passwd
        p = tmp_path / "passwd"
        p.write_text("root:x:0:0", encoding='utf-8')
        with pytest.raises(ValueError, match="\\.json"):
            _validate_geojson_path(str(p))

    def test_directory_path_raises(self, tmp_path):
        # ส่ง directory แทนไฟล์ ก็ต้อง reject
        with pytest.raises(FileNotFoundError):
            _validate_geojson_path(str(tmp_path))


# ── estimate_impact ───────────────────────────────────────────────────────────
class TestEstimateImpact:
    def test_zero_area_returns_zero_trees(self):
        out = estimate_impact(0, [{"scientific": "Samanea saman", "name_th": "จามจุรี"}])
        assert out["trees_total"] == 0
        assert out["annual_co2_tonnes"] == 0
        assert out["species_breakdown"] == []

    def test_known_species_uses_specific_coefficient(self):
        # 1 ha = 10,000 m² × 400 trees/ha = 4,000 ต้น
        # ทั้งหมดเป็น Samanea saman (28 kg CO₂/ต้น/ปี) → 112,000 kg = 112 ตัน
        out = estimate_impact(100_000, [{"scientific": "Samanea saman", "name_th": "จามจุรี"}])
        assert out["trees_total"] == 4000
        assert out["annual_co2_kg"] == 112_000
        assert out["annual_co2_tonnes"] == 112.0
        assert len(out["species_breakdown"]) == 1
        assert out["species_breakdown"][0]["trees"] == 4000
        assert out["species_breakdown"][0]["kg_co2_per_tree"] == 28.0

    def test_unknown_species_falls_back_to_default(self):
        out = estimate_impact(100_000, [{"scientific": "Unknown spp.", "name_th": "ไม่รู้จัก"}])
        # 4000 ต้น × 22 kg (IPCC default) = 88,000 kg
        assert out["annual_co2_kg"] == 88_000

    def test_multiple_species_split_evenly_with_remainder(self):
        # 4000 ต้น / 3 species = 1333, 1333, 1334 (remainder ไป species แรก)
        out = estimate_impact(100_000, [
            {"scientific": "Samanea saman", "name_th": "จามจุรี"},        # 28
            {"scientific": "Pterocarpus indicus", "name_th": "ประดู่บ้าน"},  # 22
            {"scientific": "Tectona grandis", "name_th": "สัก"},          # 24
        ])
        counts = [b["trees"] for b in out["species_breakdown"]]
        assert sum(counts) == 4000
        # species แรกได้ remainder
        assert counts[0] >= counts[1]

    def test_empty_species_list_uses_default_coefficient(self):
        out = estimate_impact(100_000, [])
        # 4000 ต้น × 22 (default) → 88 ตัน
        assert out["annual_co2_tonnes"] == 88.0
        assert out["species_breakdown"] == []

    def test_cooling_constant_returned(self):
        out = estimate_impact(100_000, [])
        assert out["expected_delta_lst_c"] == IMPACT_DEFAULTS["delta_lst_c"]
        assert out["maturity_years"] == IMPACT_DEFAULTS["maturity_years"]

    def test_cars_equivalent_uses_epa_factor(self):
        # 4.6 ตัน CO₂/ปี/รถ → 100 ตัน = 21.7 รถ
        out = estimate_impact(100_000, [{"scientific": "Samanea saman", "name_th": "จามจุรี"}])
        # 112 ตัน / 4.6 = 24.3
        assert out["equivalent_cars_off_road"] == round(112.0 / 4.6, 1)

    def test_methodology_includes_citations(self):
        out = estimate_impact(100_000, [])
        assert "methodology" in out
        assert out["methodology"]["priority_threshold"] == IMPACT_DEFAULTS["priority_threshold"]
        assert out["methodology"]["trees_per_ha"] == IMPACT_DEFAULTS["trees_per_ha"]
        assert any("IPCC" in s for s in out["methodology"]["sources"])
        assert any("Bowler" in s for s in out["methodology"]["sources"])

    def test_thai_species_have_coefficients(self):
        # smoke check: species หลักที่ใช้แนะนำต้องมีค่า coefficient
        for sp in ["Samanea saman", "Pterocarpus indicus", "Tectona grandis",
                   "Dipterocarpus alatus", "Hopea odorata"]:
            assert sp in TREE_CO2_PER_YEAR, f"missing coefficient: {sp}"
            assert TREE_CO2_PER_YEAR[sp] > 0
