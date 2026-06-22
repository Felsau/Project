"""Unit tests สำหรับ pure helpers ที่ไม่ต้องพึ่ง GEE/Supabase
รัน: cd green-area-backend && pytest tests/ -v
"""
import os

import pytest

# Import จาก backend modules — conftest.py ตั้ง sys.path ให้แล้ว
from routers.ndvi import _is_stale, compute_who_status
from routers.recommend import _normalize_weights, W_NDVI, W_LST, W_POP, W_ACCESS
from routers.recommend import species as species_mod
from routers.recommend.species import get_recommended_species
from polygon_utils import (
    validate_polygon_geometry, polygon_area_km2, validate_drawn_polygon)
from dependencies import (_validate_geojson_path, CURRENT_CACHE_VERSION,
                          ensure_province, ensure_district, get_population,
                          get_province_geom, get_district_geom,
                          PROVINCE_GEOMETRIES, DISTRICT_GEOMETRIES)
from fastapi import HTTPException
from impact import estimate_impact, IMPACT_DEFAULTS, TREE_CO2_PER_YEAR


# ── _is_stale ────────────────────────────────────────────────────────────────
class TestIsStale:
    # row "modern" ใส่ cache_version = ปัจจุบัน เพื่อให้ผ่านด่าน version ก่อน แล้ว
    # ทดสอบ "เกณฑ์อื่น" (green_area/ndvi_min) ได้ตรง ไม่ถูก version short-circuit
    def test_complete_modern_row_not_stale(self):
        row = {"green_area_pct": 35.2, "total_area_km2": 1234, "ndvi_min": 0.05,
               "cache_version": CURRENT_CACHE_VERSION}
        assert _is_stale(row) is False

    def test_missing_green_area_pct_is_stale(self):
        row = {"green_area_pct": None, "total_area_km2": 1234, "ndvi_min": 0.05,
               "cache_version": CURRENT_CACHE_VERSION}
        assert _is_stale(row) is True

    def test_missing_total_area_km2_is_stale(self):
        row = {"green_area_pct": 35, "total_area_km2": None, "ndvi_min": 0.05,
               "cache_version": CURRENT_CACHE_VERSION}
        assert _is_stale(row) is True

    def test_negative_ndvi_min_is_stale(self):
        # ndvi_min < -0.05 = cache เก่าก่อนยุค water mask
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": -0.2,
               "cache_version": CURRENT_CACHE_VERSION}
        assert _is_stale(row) is True

    def test_ndvi_min_at_boundary_not_stale(self):
        # ndvi_min = -0.05 พอดี → ไม่ stale (เงื่อนไขเป็น <)
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": -0.05,
               "cache_version": CURRENT_CACHE_VERSION}
        assert _is_stale(row) is False

    def test_ndvi_min_none_handled(self):
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": None,
               "cache_version": CURRENT_CACHE_VERSION}
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
        # CURRENT_CACHE_VERSION >= 2 (Cloud Score+) → 1 < current = stale
        row = {"green_area_pct": 35, "total_area_km2": 1234, "ndvi_min": 0.05}
        assert _is_stale(row) is (CURRENT_CACHE_VERSION > 1)


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


# ── _normalize_weights (4 ปัจจัย: NDVI/LST/pop/access) ────────────────────────
class TestNormalizeWeights:
    def test_default_weights_pass_through(self):
        n, l, p, a = _normalize_weights(W_NDVI, W_LST, W_POP, W_ACCESS)
        assert (n, l, p, a) == (W_NDVI, W_LST, W_POP, W_ACCESS)

    def test_normalize_to_sum_one(self):
        n, l, p, a = _normalize_weights(0.6, 0.4, 0.0, 0.0)
        assert abs(n + l + p + a - 1.0) < 1e-9
        assert n == pytest.approx(0.6)
        assert l == pytest.approx(0.4)
        assert p == pytest.approx(0.0)
        assert a == pytest.approx(0.0)

    def test_normalize_oversize_weights(self):
        # 2.0 + 2.0 + 1.0 + 0.0 = 5.0 → normalize เป็น 0.4, 0.4, 0.2, 0.0
        n, l, p, a = _normalize_weights(2.0, 2.0, 1.0, 0.0)
        assert (n, l, p, a) == pytest.approx((0.4, 0.4, 0.2, 0.0))

    def test_zero_total_falls_back_to_default(self):
        assert _normalize_weights(0, 0, 0, 0) == (W_NDVI, W_LST, W_POP, W_ACCESS)

    def test_negative_total_falls_back_to_default(self):
        assert _normalize_weights(-0.1, -0.1, -0.1, -0.1) == (W_NDVI, W_LST, W_POP, W_ACCESS)

    def test_access_defaults_when_omitted(self):
        # caller ที่ส่ง 3 ตัว → w_access ใช้ default · ยังคืน 4 ค่า รวม = 1
        out = _normalize_weights(1, 1, 1)
        assert len(out) == 4
        assert sum(out) == pytest.approx(1.0)

    def test_default_constants_sum_to_one(self):
        assert W_NDVI + W_LST + W_POP + W_ACCESS == pytest.approx(1.0)


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

    def test_uncertainty_range_brackets_expected(self):
        # potential 112 ตัน → low < expected < potential < high (รวมอัตรารอด+variance)
        from impact import SURVIVAL_RATE, SURVIVAL_LOW, SURVIVAL_HIGH, SEQUESTRATION_VARIANCE
        out = estimate_impact(100_000, [{"scientific": "Samanea saman", "name_th": "จามจุรี"}])
        potential = out["annual_co2_tonnes"]            # 112.0
        assert out["annual_co2_tonnes_expected"] == round(potential * SURVIVAL_RATE, 1)
        assert out["annual_co2_tonnes_low"] == round(
            potential * SURVIVAL_LOW * (1 - SEQUESTRATION_VARIANCE), 1)
        assert out["annual_co2_tonnes_high"] == round(
            potential * SURVIVAL_HIGH * (1 + SEQUESTRATION_VARIANCE), 1)
        # ordering: low < expected < potential < high
        assert (out["annual_co2_tonnes_low"] < out["annual_co2_tonnes_expected"]
                < potential < out["annual_co2_tonnes_high"])

    def test_uncertainty_zero_area_all_zero(self):
        out = estimate_impact(0, [])
        assert out["annual_co2_tonnes_low"] == 0
        assert out["annual_co2_tonnes_expected"] == 0
        assert out["annual_co2_tonnes_high"] == 0

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


# ── validate_polygon_geometry (custom-area) ──────────────────────────────────
class TestValidatePolygon:
    # ring สี่เหลี่ยมปิด (จุดแรก = จุดสุดท้าย)
    _SQUARE = {"type": "Polygon", "coordinates": [[
        [100.0, 13.0], [100.1, 13.0], [100.1, 13.1], [100.0, 13.1], [100.0, 13.0]]]}

    def test_valid_polygon_returns_coords(self):
        coords = validate_polygon_geometry(self._SQUARE)
        assert coords == self._SQUARE["coordinates"]

    def test_non_dict_raises(self):
        with pytest.raises(ValueError):
            validate_polygon_geometry("not-a-dict")

    def test_wrong_type_raises(self):
        with pytest.raises(ValueError, match="Polygon"):
            validate_polygon_geometry({"type": "Point", "coordinates": [100.0, 13.0]})

    def test_too_few_points_raises(self):
        # 3 ตำแหน่ง (รวมปิด) = 2 จุดจริง → น้อยกว่าขั้นต่ำ
        tri = {"type": "Polygon", "coordinates": [[[100.0, 13.0], [100.1, 13.0], [100.0, 13.0]]]}
        with pytest.raises(ValueError, match="3 จุด"):
            validate_polygon_geometry(tri)

    def test_out_of_range_coordinate_raises(self):
        bad = {"type": "Polygon", "coordinates": [[
            [200.0, 13.0], [100.1, 13.0], [100.1, 13.1], [200.0, 13.0]]]}
        with pytest.raises(ValueError):
            validate_polygon_geometry(bad)

    def test_non_numeric_coordinate_raises(self):
        bad = {"type": "Polygon", "coordinates": [[
            ["x", 13.0], [100.1, 13.0], [100.1, 13.1], ["x", 13.0]]]}
        with pytest.raises(ValueError):
            validate_polygon_geometry(bad)

    def test_empty_coordinates_raises(self):
        with pytest.raises(ValueError):
            validate_polygon_geometry({"type": "Polygon", "coordinates": []})


# ── polygon_area_km2 (geodesic) ──────────────────────────────────────────────
class TestPolygonArea:
    def test_known_box_area_within_tolerance(self):
        # กล่อง 0.1°×0.1° ที่ ~13°N: ลองจิจูดหด cos(13°)≈0.974
        # ด้านราว 11.13 km (lat) × 10.84 km (lng) ≈ 120 km² (±5%)
        ring = [[100.0, 13.0], [100.1, 13.0], [100.1, 13.1], [100.0, 13.1], [100.0, 13.0]]
        area = polygon_area_km2([ring])
        assert 114 < area < 126, f"got {area} km²"

    def test_winding_order_independent(self):
        cw = [[100.0, 13.0], [100.1, 13.0], [100.1, 13.1], [100.0, 13.1], [100.0, 13.0]]
        ccw = list(reversed(cw))
        assert polygon_area_km2([cw]) == pytest.approx(polygon_area_km2([ccw]), rel=1e-9)

    def test_hole_subtracted(self):
        outer = [[100.0, 13.0], [100.2, 13.0], [100.2, 13.2], [100.0, 13.2], [100.0, 13.0]]
        hole = [[100.05, 13.05], [100.15, 13.05], [100.15, 13.15], [100.05, 13.15], [100.05, 13.05]]
        with_hole = polygon_area_km2([outer, hole])
        without = polygon_area_km2([outer])
        assert with_hole < without

    def test_empty_coords_zero(self):
        assert polygon_area_km2([]) == 0.0


# ── validate_drawn_polygon (รวม guard ที่ 3 endpoint ใช้ร่วมกัน) ──────────────
class TestValidateDrawnPolygon:
    _SQUARE = {"type": "Polygon", "coordinates": [[
        [100.0, 13.0], [100.1, 13.0], [100.1, 13.1], [100.0, 13.1], [100.0, 13.0]]]}

    def test_valid_returns_area(self):
        area = validate_drawn_polygon(self._SQUARE)
        assert 114 < area < 126   # ~120 km² (เหมือน TestPolygonArea)

    def test_non_polygon_raises(self):
        with pytest.raises(ValueError, match="Polygon"):
            validate_drawn_polygon({"type": "Point", "coordinates": [100, 13]})

    def test_too_few_points_raises(self):
        tri = {"type": "Polygon", "coordinates": [[[100.0, 13.0], [100.1, 13.0], [100.0, 13.0]]]}
        with pytest.raises(ValueError, match="3 จุด"):
            validate_drawn_polygon(tri)

    def test_too_large_raises(self):
        huge = {"type": "Polygon", "coordinates": [[
            [97.0, 6.0], [106.0, 6.0], [106.0, 20.0], [97.0, 20.0], [97.0, 6.0]]]}
        with pytest.raises(ValueError, match="ใหญ่เกินไป"):
            validate_drawn_polygon(huge)


# ── get_recommended_species — region จาก provinces (DB) + fallback hardcoded ──
class TestRecommendedSpecies:
    def test_known_province_fallback_region(self, monkeypatch):
        # DB ว่าง (migration ยังไม่รัน) → ใช้ PROVINCE_REGION hardcoded
        monkeypatch.setattr(species_mod, "_db_region_map", lambda: {})
        out = get_recommended_species("Chiang Mai")
        assert out["region"] == "เหนือ"
        assert len(out["species"]) > 0

    def test_unknown_province_returns_empty(self, monkeypatch):
        monkeypatch.setattr(species_mod, "_db_region_map", lambda: {})
        assert get_recommended_species("Atlantis") == {"region": None, "species": []}

    def test_db_region_takes_precedence(self, monkeypatch):
        # provinces ใน DB ให้ภาคต่างจาก hardcoded → ต้องใช้ค่าจาก DB
        monkeypatch.setattr(species_mod, "_db_region_map", lambda: {"Tak": "เหนือ"})
        assert get_recommended_species("Tak")["region"] == "เหนือ"  # hardcoded = ตะวันตก


# ── province/district guards (ensure_* / get_*_geom) ──────────────────────────
class TestGeometryGuards:
    def _sample_province(self):
        return next(iter(PROVINCE_GEOMETRIES))

    def _sample_district(self):
        # DISTRICT_GEOMETRIES key = (province, district) · อาจว่างถ้ายังไม่ generate
        return next(iter(DISTRICT_GEOMETRIES), None)

    def test_ensure_province_ok_for_valid(self):
        ensure_province(self._sample_province())  # ไม่ควร raise

    def test_ensure_province_404_for_invalid(self):
        with pytest.raises(HTTPException) as e:
            ensure_province("Atlantis")
        assert e.value.status_code == 404

    def test_get_province_geom_returns_dict(self):
        geom = get_province_geom(self._sample_province())
        assert isinstance(geom, dict)

    def test_get_province_geom_404_for_invalid(self):
        with pytest.raises(HTTPException) as e:
            get_province_geom("Atlantis")
        assert e.value.status_code == 404

    def test_district_guards(self):
        pair = self._sample_district()
        if pair is None:
            pytest.skip("ไม่มี DISTRICT_GEOMETRIES (ยังไม่ generate)")
        prov, dist = pair
        ensure_district(prov, dist)                       # valid → ไม่ raise
        assert isinstance(get_district_geom(prov, dist), dict)
        with pytest.raises(HTTPException) as e:
            ensure_district(prov, "ไม่มีอำเภอนี้จริง")
        assert e.value.status_code == 404
        with pytest.raises(HTTPException):
            get_district_geom(prov, "ไม่มีอำเภอนี้จริง")


# ── rank_species_by_site ──────────────────────────────────────────────────────
class TestSiteAwareSpecies:
    SAMPLE = [
        {"name_th": "ร่มเงา", "scientific": "Aa", "purpose": "ร่มเงาในเมือง",
         "traits": ["ร่มเงากว้าง", "ลดความร้อนเมือง"], "reason": "ทรงพุ่มใหญ่"},
        {"name_th": "ทนทาน", "scientific": "Bb", "purpose": "ฟื้นฟูดิน",
         "traits": ["ทนแล้ง", "ตรึงไนโตรเจน"], "reason": "ปรับปรุงดินเสื่อม"},
        {"name_th": "พื้นถิ่น", "scientific": "Cc", "purpose": "อนุรักษ์",
         "traits": ["พันธุ์พื้นถิ่น", "อายุยืน"], "reason": "หายาก"},
    ]

    def test_no_signal_returns_unchanged(self):
        # ไม่มี lst/ndvi → คืน list เดิม (ref เดิม)
        assert species_mod.rank_species_by_site(self.SAMPLE) is self.SAMPLE

    def test_hot_site_promotes_shade_species(self):
        out = species_mod.rank_species_by_site(self.SAMPLE, lst_mean=38.0, ndvi_mean=0.45)
        assert out[0]["scientific"] == "Aa"
        assert out[0]["site_fit"] and "ร่มเงา" in out[0]["site_fit"]

    def test_degraded_site_promotes_hardy_species(self):
        out = species_mod.rank_species_by_site(self.SAMPLE, lst_mean=30.0, ndvi_mean=0.2)
        assert out[0]["scientific"] == "Bb"
        assert "เสื่อมโทรม" in out[0]["site_fit"]

    def test_green_site_promotes_biodiversity_species(self):
        out = species_mod.rank_species_by_site(self.SAMPLE, lst_mean=30.0, ndvi_mean=0.6)
        assert out[0]["scientific"] == "Cc"

    def test_does_not_mutate_original(self):
        species_mod.rank_species_by_site(self.SAMPLE, lst_mean=38.0, ndvi_mean=0.2)
        assert "site_fit" not in self.SAMPLE[0]

    def test_get_recommended_species_with_metrics_annotates(self):
        out = get_recommended_species("Bangkok Metropolis", lst_mean=38.0, ndvi_mean=0.45)
        assert out["region"] is not None
        assert any(s.get("site_fit") for s in out["species"])


# ── _site_fit (per-species scoring เทียบสภาพพื้นที่) ──────────────────────────
class TestSiteFit:
    _SHADE = {"traits": ["ร่มเงากว้าง", "ลดความร้อน"], "purpose": "ร่มเงา", "reason": "ให้ร่มเงา"}
    _NEUTRAL = {"traits": ["สวยงาม"], "purpose": "ประดับ", "reason": "ปลูกง่าย"}

    def test_hot_matches_shade_keyword(self):
        score, reason = species_mod._site_fit(self._SHADE, hot=True, degraded=False, green=False)
        assert score == 2
        assert reason == "ให้ร่มเงาในพื้นที่ร้อน"

    def test_no_signal_scores_zero_and_none(self):
        score, reason = species_mod._site_fit(self._SHADE, hot=False, degraded=False, green=False)
        assert score == 0 and reason is None

    def test_neutral_species_never_matches(self):
        score, reason = species_mod._site_fit(self._NEUTRAL, hot=True, degraded=True, green=True)
        assert score == 0 and reason is None

    def test_multiple_conditions_accumulate(self):
        combo = {"traits": ["ร่มเงากว้าง", "ทนแล้ง"], "purpose": "", "reason": ""}
        score, reason = species_mod._site_fit(combo, hot=True, degraded=True, green=False)
        assert score == 4
        assert "ให้ร่มเงาในพื้นที่ร้อน" in reason
        assert "ทนทาน เหมาะพื้นที่เสื่อมโทรม" in reason
        assert " · " in reason   # หลายเหตุผลเชื่อมด้วย separator


# ── get_population — fallback ต้องบอก "ปีจริง" ของประชากรที่ใช้ ─────────────────
class _PopResp:
    def __init__(self, data):
        self.data = data


class TestGetPopulation:
    def test_exact_year_returns_population_and_same_year(self, monkeypatch):
        # ปีที่ขอมีข้อมูลตรง → คืนปีนั้นเป๊ะ
        monkeypatch.setattr("dependencies.supa_call",
            lambda fn, **kw: _PopResp([{"population": 1_500_000, "year": 2020}]))
        assert get_population("Bangkok Metropolis", 2020) == (1_500_000, 2020)

    def test_missing_year_falls_back_to_latest_and_reports_that_year(self, monkeypatch):
        # ปีที่ขอไม่มี → fallback ปีล่าสุด *และคืนปีจริง* (ไม่ใช่ปีที่ขอ)
        responses = iter([
            _PopResp([]),                                       # ขอ 2024 → ไม่มี
            _PopResp([{"population": 1_400_000, "year": 2022}]),  # fallback ปีล่าสุด
        ])
        monkeypatch.setattr("dependencies.supa_call",
            lambda fn, **kw: next(responses))
        assert get_population("Bangkok Metropolis", 2024) == (1_400_000, 2022)

    def test_no_data_returns_none_none(self, monkeypatch):
        monkeypatch.setattr("dependencies.supa_call",
            lambda fn, **kw: _PopResp([]))
        assert get_population("Nowhere", 2020) == (None, None)
