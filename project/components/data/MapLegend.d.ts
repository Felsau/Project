/**
 * Floating map color key for NDVI / LST choropleths or continuous raster ramps.
 */
export interface MapLegendProps {
  /** Bucketed key to render: 'ndvi' greens or 'lst' heat. */
  mode?: 'ndvi' | 'lst';
  /** Override the title line. */
  title?: string;
  /** CSS gradient string — switches to a continuous ramp with min/max ticks. */
  gradient?: string;
  min?: string;
  max?: string;
  /** Show the "no data" row (default true). */
  showEmpty?: boolean;
}
export declare function MapLegend(props: MapLegendProps): JSX.Element;
