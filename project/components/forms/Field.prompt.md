Form field primitives: `Field` (input), `Select`, and the uppercase tracked `Label`.

```jsx
<Label htmlFor="province">จังหวัด</Label>
<Field id="province" placeholder="ค้นหาจังหวัด…" />

<Label htmlFor="year">ปี</Label>
<Select id="year"><option>2569</option><option>2568</option></Select>
```

Focus state is a 2px soft-green outline — comes free from the stylesheet.
