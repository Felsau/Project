Thin editorial app header — diamond mark, title with greyed suffix, live-source badge, unicode icon buttons (no icon font), animated hairline loading bar.

```jsx
<TopBar
  title="GreenLens"
  subtitle="Thailand"
  source="Sentinel-2"
  loading={false}
  onShowAbout={() => {}}
  onToggleTheme={() => {}}
  onToggleSidebar={() => {}}
/>
```

Buttons render only when their handler is provided.
