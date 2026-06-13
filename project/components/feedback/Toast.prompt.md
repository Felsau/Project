Feedback primitives — quiet toast cards and the live data status dot.

```jsx
<Toast onDismiss={dismiss}>บันทึกรายงานแล้ว</Toast>
<Toast type="error" onDismiss={dismiss}>ส่งออกไม่สำเร็จ: เครือข่ายขัดข้อง</Toast>

<StatusDot state="ready">ข้อมูลสด · Sentinel-2</StatusDot>
<StatusDot state="loading">กำลังโหลดข้อมูล GEE</StatusDot>
```

Stack toasts fixed at top-right (top 52px, right 16px), newest last. No icons, no emoji — the 2px edge carries the tone.
