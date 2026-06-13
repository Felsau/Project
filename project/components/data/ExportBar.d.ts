/**
 * Flat joined export strip (CSV / PNG / PDF) with busy state.
 */
export interface ExportBarProps {
  buttons: { id: string; label: string }[];
  /** id of the action in flight — disables the strip, shows "…". */
  busy?: string | null;
  onAction?: (id: string) => void;
  /** Section title above the strip. */
  title?: string;
}
export declare function ExportBar(props: ExportBarProps): JSX.Element;
