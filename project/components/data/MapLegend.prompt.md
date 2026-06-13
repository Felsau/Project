Floating color key shown over the map, bottom-left. Bucketed NDVI/LST rows, or a continuous gradient ramp for raster overlays.

```jsx
<MapLegend mode="ndvi" />
<MapLegend mode="lst" />
<MapLegend gradient="var(--grad-ndvi)" min="0.0" max="0.8" title="NDVI (raster)" />
```

Labels are Thai by default — pass `title` to override.
