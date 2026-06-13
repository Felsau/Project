/**
 * Toast card with tone edge, and the live StatusDot indicator.
 */
export interface ToastProps {
  /** 'info' green edge | 'error' red edge. */
  type?: 'info' | 'error';
  children?: React.ReactNode;
  /** Renders the × dismiss button. */
  onDismiss?: () => void;
}
export declare function Toast(props: ToastProps): JSX.Element;

export interface StatusDotProps {
  /** 'ready' solid green | 'loading' pulsing | 'empty' grey. */
  state?: 'ready' | 'loading' | 'empty';
  children?: React.ReactNode;
}
export declare function StatusDot(props: StatusDotProps): JSX.Element;
