"""Pure statistical helpers — ordinary-least-squares regression + Mann-Kendall
trend test + linear forecast. Stdlib `math` only (no numpy/scipy) so they
unit-test trivially and run server-side on cached rows without touching
GEE/Supabase.

ใช้ใน:
  - /analysis/cooling  → linregress(NDVI, LST) วัด cooling gradient
  - /analysis/timeseries → mann_kendall() ทดสอบนัยสำคัญของแนวโน้มหลายปี
                         + forecast_linear() คาดการณ์ปีข้างหน้า
"""
import math


def _sign(x: float) -> int:
    return (x > 0) - (x < 0)


def _normal_cdf(z: float) -> float:
    """Standard-normal CDF via erf — สำหรับ p-value ของ Mann-Kendall."""
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def linregress(xs, ys) -> dict | None:
    """Ordinary least-squares fit  ys = slope·xs + intercept.

    Returns dict(slope, intercept, r, r2, n) — r = Pearson correlation.
    Returns None ถ้าจุด < 2, ความยาวไม่เท่ากัน, หรือ x ไม่มีความแปรปรวน (fit ไม่ได้).
    """
    n = len(xs)
    if n < 2 or len(ys) != n:
        return None
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    sxx = sum((x - mean_x) ** 2 for x in xs)
    syy = sum((y - mean_y) ** 2 for y in ys)
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    if sxx == 0:
        return None  # x คงที่ → หาความชันไม่ได้
    slope = sxy / sxx
    intercept = mean_y - slope * mean_x
    r = 0.0 if syy == 0 else sxy / math.sqrt(sxx * syy)
    r = max(-1.0, min(1.0, r))  # clamp floating-point drift
    return {
        "slope": round(slope, 4),
        "intercept": round(intercept, 4),
        "r": round(r, 4),
        "r2": round(r * r, 4),
        "n": n,
    }


def mann_kendall(values, alpha: float = 0.05) -> dict | None:
    """Mann-Kendall monotonic trend test บนลำดับที่เรียงตามเวลาแล้ว.

    คืน dict(s, tau, z, p_value, trend, n) — trend ∈ {increasing, decreasing,
    no trend} ตัดสินที่ p < alpha. ใช้ normal approximation + tie correction.
    Returns None ถ้าจุด < 3 (MK ต้องมีอย่างน้อย 3 จุด).
    """
    n = len(values)
    if n < 3:
        return None

    s = 0
    for i in range(n - 1):
        for j in range(i + 1, n):
            s += _sign(values[j] - values[i])

    # variance พร้อม tie correction
    ties: dict = {}
    for v in values:
        ties[v] = ties.get(v, 0) + 1
    tie_term = sum(t * (t - 1) * (2 * t + 5) for t in ties.values())
    var_s = (n * (n - 1) * (2 * n + 5) - tie_term) / 18.0

    if var_s <= 0:
        z = 0.0
    elif s > 0:
        z = (s - 1) / math.sqrt(var_s)
    elif s < 0:
        z = (s + 1) / math.sqrt(var_s)
    else:
        z = 0.0

    p = max(0.0, min(1.0, 2 * (1 - _normal_cdf(abs(z)))))
    n0 = n * (n - 1) / 2
    tau = s / n0 if n0 else 0.0

    if p < alpha and s > 0:
        trend = "increasing"
    elif p < alpha and s < 0:
        trend = "decreasing"
    else:
        trend = "no trend"

    return {
        "s": s,
        "tau": round(tau, 4),
        "z": round(z, 4),
        "p_value": round(p, 4),
        "trend": trend,
        "n": n,
    }


# ค่าวิกฤต t สองหาง 95% ตาม degrees of freedom — series รายปีมีจุดน้อย (df มัก
# < 10) ใช้ z=1.96 ตรงๆ จะได้ช่วงคาดการณ์แคบเกินจริง
_T_CRIT_95 = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    12: 2.179, 15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042,
}


def _t_crit(df: int) -> float:
    """ค่า t วิกฤต 95% — เลือกค่าของ df ที่รู้จักตัวล่าสุดที่ ≤ df (conservative)"""
    if df <= 0:
        return float("inf")
    best = _T_CRIT_95[1]
    for known, t in sorted(_T_CRIT_95.items()):
        if known <= df:
            best = t
        else:
            break
    return best if df <= 30 else 1.96


def forecast_linear(xs, ys, horizon: int = 3,
                    clamp: tuple[float, float] | None = None) -> dict | None:
    """OLS projection ไปอีก `horizon` จุดข้างหน้า พร้อม 95% prediction interval.

    ใช้กับ series รายปี (xs=ปี, ys=ค่า) — คืน dict(slope, intercept, r2, n,
    points) โดย points = [{x, value, lo, hi}] · clamp=(min, max) บีบผลให้อยู่
    ในช่วงที่เป็นไปได้จริง เช่น NDVI ∈ (-1, 1) หรือ % ∈ (0, 100).

    คืน None ถ้าจุด < 3 — เส้นตรงลาก 2 จุดได้เสมอ (residual = 0) จึงไม่มี
    ข้อมูลพอประเมินความไม่แน่นอนของการคาดการณ์.
    """
    n = len(xs)
    if n < 3 or len(ys) != n:
        return None
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    sxx = sum((x - mean_x) ** 2 for x in xs)
    if sxx == 0:
        return None  # x คงที่ → หาความชันไม่ได้
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    syy = sum((y - mean_y) ** 2 for y in ys)
    # คำนวณจากค่า unrounded — ไม่ reuse linregress() เพราะ slope ถูก round 4 ตำแหน่ง
    # (NDVI เปลี่ยน ~0.001/ปี การ round ก่อนคูณ horizon ทำให้คลาดเคลื่อนสะสม)
    slope = sxy / sxx
    intercept = mean_y - slope * mean_x
    r = 0.0 if syy == 0 else sxy / math.sqrt(sxx * syy)
    r = max(-1.0, min(1.0, r))

    df = n - 2
    sse = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(xs, ys))
    se = math.sqrt(sse / df)
    t = _t_crit(df)

    def _clamped(v: float) -> float:
        if clamp is None:
            return v
        return max(clamp[0], min(clamp[1], v))

    last_x = max(xs)
    points = []
    for k in range(1, horizon + 1):
        x = last_x + k
        y_hat = slope * x + intercept
        # prediction interval ของ observation ใหม่ — กว้างขึ้นเมื่อ extrapolate ไกล
        se_pred = se * math.sqrt(1.0 + 1.0 / n + (x - mean_x) ** 2 / sxx)
        points.append({
            "x": x,
            "value": round(_clamped(y_hat), 4),
            "lo": round(_clamped(y_hat - t * se_pred), 4),
            "hi": round(_clamped(y_hat + t * se_pred), 4),
        })

    return {
        "slope": round(slope, 4),
        "intercept": round(intercept, 4),
        "r2": round(r * r, 4),
        "n": n,
        "points": points,
    }
