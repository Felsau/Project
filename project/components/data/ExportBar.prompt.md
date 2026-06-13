Joined flat export strip used at the bottom of data panels — CSV, PNG, PDF, "PNG + แผนที่".

```jsx
<ExportBar
  buttons={[{ id: 'csv', label: 'CSV' }, { id: 'png', label: 'PNG' }, { id: 'pdf', label: 'PDF' }]}
  busy={null}
  onAction={(id) => startExport(id)}
/>
```

While an action runs, its label becomes "…" and the whole strip disables.
