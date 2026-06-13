Standard action button — quiet bordered default, single green primary per view, underlined text variant for tertiary actions.

```jsx
<Button variant="primary">สร้างรายงาน PDF</Button>
<Button>ยกเลิก</Button>
<Button variant="text">← ดูภาพรวมประเทศ</Button>
```

- `variant="primary"` — solid green; reserve for the one main action
- `variant="text"` — underlined, accent-colored, no border
- `size="sm"`, `full`, `disabled` as expected
- Never put emoji in button labels; plain text (Thai or English) only
