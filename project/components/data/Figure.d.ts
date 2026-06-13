/**
 * Typographic stat primitives: Figure, KVRow/KV grid, Note, DefList.
 */
export interface FigureProps {
  /** Formatted number string, e.g. "0.412". */
  value: string;
  /** Unit shown after the numeral, e.g. "NDVI", "°C". */
  unit?: string;
  /** Right-aligned meta tag, e.g. data vintage. */
  tag?: string;
  /** 0–100; renders the 3px progress bar under the figure. */
  progress?: number;
}
export declare function Figure(props: FigureProps): JSX.Element;

export interface KVRowProps {
  cols?: 2 | 3;
  children?: React.ReactNode;
}
export declare function KVRow(props: KVRowProps): JSX.Element;

export interface KVProps {
  label: string;
  value: string;
  hint?: string;
}
export declare function KV(props: KVProps): JSX.Element;

export interface NoteProps {
  /** 'default' green | 'warn' amber | 'crit' red. */
  tone?: 'default' | 'warn' | 'crit';
  /** Uppercase label line, e.g. "ข้อค้นพบ". */
  label?: string;
  children?: React.ReactNode;
}
export declare function Note(props: NoteProps): JSX.Element;

export interface DefListProps {
  items: { label: string; value: string }[];
}
export declare function DefList(props: DefListProps): JSX.Element;
