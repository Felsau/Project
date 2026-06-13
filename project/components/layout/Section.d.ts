/**
 * Editorial section primitives: Section stack, SectionHead rule, Collapsible.
 */
export interface SectionProps {
  children?: React.ReactNode;
}
export declare function Section(props: SectionProps): JSX.Element;

export interface SectionHeadProps {
  /** Uppercase tracked title, e.g. "ดัชนีพืชพรรณ". */
  title: string;
  /** Right-aligned meta, e.g. year or source. */
  meta?: string;
  /** Drop the hairline rule. */
  quiet?: boolean;
}
export declare function SectionHead(props: SectionHeadProps): JSX.Element;

export interface CollapsibleProps {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}
export declare function Collapsible(props: CollapsibleProps): JSX.Element;
