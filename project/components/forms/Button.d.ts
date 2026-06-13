/**
 * Quiet bordered button; green primary used at most once per view.
 */
export interface ButtonProps {
  /** 'default' (bordered) | 'primary' (green) | 'text' (underlined link-style). */
  variant?: 'default' | 'primary' | 'text';
  /** 'sm' for compact contexts. */
  size?: 'sm';
  /** Stretch to container width. */
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
