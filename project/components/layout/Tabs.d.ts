/**
 * Sidebar tab strip with ink underline on the active tab.
 */
export interface TabsProps {
  tabs: { id: string; label: string }[];
  active: string;
  onChange?: (id: string) => void;
}
export declare function Tabs(props: TabsProps): JSX.Element;
