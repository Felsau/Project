Sidebar tab strip — flat text tabs with an ink underline on the active item.

```jsx
<Tabs
  tabs={[{ id: 'stats', label: 'ข้อมูล' }, { id: 'trend', label: 'แนวโน้ม' }, { id: 'recommend', label: 'AI แนะนำ' }]}
  active="stats"
  onChange={setTab}
/>
```
