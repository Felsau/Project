/**
 * Toggle chip for metric/year selection — active state is solid ink, not green.
 */
export interface ChipProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}
export declare function Chip(props: ChipProps): JSX.Element;
