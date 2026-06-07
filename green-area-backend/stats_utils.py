"""Pure statistical helpers — ordinary-least-squares regression + Mann-Kendall
trend test. Stdlib `math` only (no numpy/scipy) so they unit-test trivially and
run server-side on cached rows without touching GEE/Supabase.

ใช้ใน:
  - /analysis/cooling  → linregress(NDVI, LST) วัด cooling gradient
  - /analysis/timeseries → mann_kendall() ทดสอบนัยสำคัญของแนวโน้มหลายปี
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
