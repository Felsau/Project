"""สร้างภาพ flowchart ของ User Flow สำหรับฝังใน PDF ข้อเสนอโครงการ
Layout: Serpentine 2 rows × 4 cols (7 steps) + cache decision as inline note
Output: user_flow_diagram.png (landscape, fits 170mm width in PDF)
"""
import os
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, PathPatch
from matplotlib.path import Path

ROOT = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(ROOT, 'green-area-frontend', 'public', 'fonts')

# ── Register Sarabun font ───────────────────────────────────────────────────
fm.fontManager.addfont(os.path.join(FONT_DIR, 'Sarabun-Regular.ttf'))
fm.fontManager.addfont(os.path.join(FONT_DIR, 'Sarabun-Bold.ttf'))
plt.rcParams['font.family'] = 'Sarabun'

# ── Colors ──────────────────────────────────────────────────────────────────
C = {
    'box_fill':     '#ffffff',
    'box_edge':     '#1a73e8',
    'box_fill_2':   '#e8f0fe',
    'gee_fill':     '#dcfce7',
    'gee_edge':     '#16a34a',
    'export_fill':  '#ede9fe',
    'export_edge':  '#7c3aed',
    'arrow':        '#5f6368',
    'text':         '#202124',
    'muted':        '#5f6368',
    'cache_fill':   '#fef9c3',
    'cache_edge':   '#ca8a04',
}

# ── Figure setup ────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(12, 7), dpi=200)
ax.set_xlim(0, 120)
ax.set_ylim(0, 70)
ax.set_aspect('equal')
ax.axis('off')

# ── Helpers ─────────────────────────────────────────────────────────────────
def step_box(x, y, w, h, num, title, subtitle, fill, edge, num_bg=None):
    num_bg = num_bg or edge
    box = FancyBboxPatch(
        (x, y), w, h,
        boxstyle='round,pad=0.3,rounding_size=1.0',
        linewidth=1.5, edgecolor=edge, facecolor=fill,
    )
    ax.add_patch(box)
    cx = x + 3.3
    cy = y + h / 2
    circ = Circle((cx, cy), 2.2, color=num_bg, zorder=3)
    ax.add_patch(circ)
    ax.text(cx, cy, str(num), ha='center', va='center',
            fontsize=12, color='white', fontweight='bold', zorder=4)
    tx = x + 7
    ax.text(tx, y + h * 0.63, title,
            ha='left', va='center', fontsize=10.5, fontweight='bold',
            color=C['text'])
    ax.text(tx, y + h * 0.27, subtitle,
            ha='left', va='center', fontsize=8.5, color=C['muted'])

def arrow_h(x1, x2, y, color=None):
    """Horizontal arrow"""
    color = color or C['arrow']
    arr = FancyArrowPatch((x1, y), (x2, y),
                          arrowstyle='-|>', mutation_scale=14,
                          linewidth=1.4, color=color, zorder=2)
    ax.add_patch(arr)

def serpentine_arrow(x_start, y_top, y_bot, color=None):
    """Curved arrow from right of one box to right of another box one row below"""
    color = color or C['arrow']
    # Path: right of top box → out right → down → into right of bottom box
    verts = [
        (x_start, y_top),                # start at right edge of top box
        (x_start + 4, y_top),            # out to the right
        (x_start + 4, y_bot),            # down
        (x_start, y_bot),                # back left to top of bottom box
    ]
    codes = [Path.MOVETO, Path.LINETO, Path.LINETO, Path.LINETO]
    path = Path(verts, codes)
    patch = PathPatch(path, fill=False, edgecolor=color, linewidth=1.4, zorder=2)
    ax.add_patch(patch)
    # Add arrowhead at end
    arrow_head = FancyArrowPatch((x_start + 0.5, y_bot), (x_start, y_bot),
                                 arrowstyle='-|>', mutation_scale=14,
                                 color=color, linewidth=1.4, zorder=2)
    ax.add_patch(arrow_head)

# ── Title ───────────────────────────────────────────────────────────────────
ax.text(60, 66.5, 'User Flow — ลำดับการใช้งานระบบ',
        ha='center', va='center', fontsize=15, fontweight='bold',
        color=C['text'])
ax.text(60, 63,
        'จาก "เปิดเว็บ" สู่ "ดาวน์โหลดรายงาน PDF" ผ่าน 7 ขั้นตอน · '
        'ออกแบบบนสถาปัตยกรรม 3-tier (React → FastAPI → GEE/Supabase)',
        ha='center', va='center', fontsize=9.5, color=C['muted'])

# ── Layout: Serpentine 2 rows × 4 columns ───────────────────────────────────
BOX_W = 26
BOX_H = 9
GAP_X = 3.5
ROW1_Y = 42
ROW2_Y = 16

# Row 1: Step 1, 2, 3, 4 (left to right)
COL_X = [3, 3 + (BOX_W + GAP_X) * 1, 3 + (BOX_W + GAP_X) * 2, 3 + (BOX_W + GAP_X) * 3]

step_box(COL_X[0], ROW1_Y, BOX_W, BOX_H, '1',
         'เปิดเว็บแอปพลิเคชัน',
         'โหลดแผนที่ 77 จังหวัด (GADM v4.1)',
         C['box_fill'], C['box_edge'])
arrow_h(COL_X[0] + BOX_W, COL_X[1], ROW1_Y + BOX_H/2)

step_box(COL_X[1], ROW1_Y, BOX_W, BOX_H, '2',
         'คลิกเลือกจังหวัด',
         'Frontend ส่ง request → FastAPI',
         C['box_fill'], C['box_edge'])
arrow_h(COL_X[1] + BOX_W, COL_X[2], ROW1_Y + BOX_H/2)

step_box(COL_X[2], ROW1_Y, BOX_W, BOX_H, '3',
         'Backend ประมวลผล',
         'ดึง cache · ถ้าไม่มี → เรียก GEE',
         C['gee_fill'], C['gee_edge'])
arrow_h(COL_X[2] + BOX_W, COL_X[3], ROW1_Y + BOX_H/2)

step_box(COL_X[3], ROW1_Y, BOX_W, BOX_H, '4',
         'แสดงสถิติ NDVI/LST',
         'พร้อมเทียบ WHO 9 m²/คน',
         C['box_fill_2'], C['box_edge'])

# Serpentine bend: from Step 4 (top-right) down to Step 5 (bottom-right)
serpentine_arrow(COL_X[3] + BOX_W, ROW1_Y + BOX_H/2,
                 ROW2_Y + BOX_H/2)

# Row 2: Step 7, 6, 5 (left to right visually, but flow is RIGHT to LEFT)
step_box(COL_X[3], ROW2_Y, BOX_W, BOX_H, '5',
         'สลับ Tab วิเคราะห์',
         'Trend · Compare · Districts',
         C['box_fill'], C['box_edge'])

# Arrow from 5 (right column) ← 6 (mid right) — but visually goes left
arrow_h(COL_X[3], COL_X[2] + BOX_W, ROW2_Y + BOX_H/2)

step_box(COL_X[2], ROW2_Y, BOX_W, BOX_H, '6',
         'AI Recommend',
         'Heatmap · Top 10 · Species · Impact',
         C['box_fill_2'], C['box_edge'])

# Arrow 6 ← 7
arrow_h(COL_X[2], COL_X[1] + BOX_W, ROW2_Y + BOX_H/2)

step_box(COL_X[1], ROW2_Y, BOX_W, BOX_H, '7',
         'Export PDF Report',
         'รายงานคุณภาพระดับวิทยานิพนธ์',
         C['export_fill'], C['export_edge'])

# ── Cache callout (highlight Step 3's internal logic) ──────────────────────
# Small note box pointing to Step 3 from above
note_x = COL_X[2] + 2
note_y = ROW1_Y - 6
note_w = BOX_W - 4
note_h = 4
note_box = FancyBboxPatch(
    (note_x, note_y - note_h), note_w, note_h,
    boxstyle='round,pad=0.2,rounding_size=0.5',
    linewidth=1.0, edgecolor=C['cache_edge'], facecolor=C['cache_fill'],
)
ax.add_patch(note_box)
ax.text(note_x + note_w/2, note_y - note_h/2,
        'Cache hit < 2s · Miss → GEE 30–60s',
        ha='center', va='center', fontsize=8.5,
        color=C['text'], fontweight='bold')

# Small connecting line from Step 3 down to note
arr = FancyArrowPatch((COL_X[2] + BOX_W/2, ROW1_Y),
                      (COL_X[2] + BOX_W/2, note_y - 0.3),
                      arrowstyle='-', linewidth=1.0,
                      linestyle='dashed', color=C['cache_edge'], zorder=1)
ax.add_patch(arr)

# ── Legend (horizontal at bottom) ──────────────────────────────────────────
LEG_Y = 3

def legend_chip(x, y, fill, edge, label):
    box = FancyBboxPatch((x, y), 3, 3,
                         boxstyle='round,pad=0.1,rounding_size=0.5',
                         facecolor=fill, edgecolor=edge, linewidth=1.3)
    ax.add_patch(box)
    ax.text(x + 4, y + 1.5, label, fontsize=9, va='center',
            color=C['text'])

legend_chip(3,  LEG_Y, C['box_fill'],    C['box_edge'],    'ขั้นตอนปกติ (UI/Backend)')
legend_chip(38, LEG_Y, C['box_fill_2'],  C['box_edge'],    'แสดงผล/Output')
legend_chip(63, LEG_Y, C['gee_fill'],    C['gee_edge'],    'เรียก External Service')
legend_chip(92, LEG_Y, C['export_fill'], C['export_edge'], 'ผลลัพธ์สุดท้าย')

# ── Save ────────────────────────────────────────────────────────────────────
out_path = os.path.join(ROOT, 'user_flow_diagram.png')
plt.savefig(out_path, dpi=200, bbox_inches='tight',
            facecolor='white', edgecolor='none')
plt.close(fig)
print(f'[OK] Generated: {out_path}')
print(f'     Size: {os.path.getsize(out_path):,} bytes')
