/**
 * Brand diamond mark + optional wordmark.
 */
export interface BrandMarkProps {
  /** Square size of the diamond in px (it renders rotated 45°). */
  size?: number;
  /** Render the wordmark next to the mark. */
  withWordmark?: boolean;
  /** Wordmark text. */
  label?: string;
}
export declare function BrandMark(props: BrandMarkProps): JSX.Element;
