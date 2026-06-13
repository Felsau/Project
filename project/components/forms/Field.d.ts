/**
 * System text input, select and uppercase tracked label.
 */
export interface FieldProps {
  id?: string;
  value?: string;
  onChange?: (e: any) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}
export declare function Field(props: FieldProps): JSX.Element;

export interface SelectProps {
  id?: string;
  value?: string;
  onChange?: (e: any) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}
export declare function Select(props: SelectProps): JSX.Element;

export interface LabelProps {
  htmlFor?: string;
  children?: React.ReactNode;
}
export declare function Label(props: LabelProps): JSX.Element;
