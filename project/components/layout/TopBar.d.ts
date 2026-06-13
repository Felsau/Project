/**
 * 40px product top bar: brand, source badge, unicode icon buttons, loading line.
 */
export interface TopBarProps {
  title?: string;
  /** Greyed suffix after the title, e.g. "Thailand". */
  subtitle?: string;
  /** Data source name shown bold in the meta strip. */
  source?: string;
  sourceMeta?: string;
  /** Shows the animated 1px loading line under the bar. */
  loading?: boolean;
  theme?: 'light' | 'dark';
  sidebarCollapsed?: boolean;
  onBrandClick?: () => void;
  /** Render the ⓘ about button. */
  onShowAbout?: () => void;
  /** Render the ☾/☀ theme button. */
  onToggleTheme?: () => void;
  /** Render the sidebar collapse toggle. */
  onToggleSidebar?: () => void;
}
export declare function TopBar(props: TopBarProps): JSX.Element;
