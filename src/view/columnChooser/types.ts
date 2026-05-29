export type ColumnChooserColumn = {
  name: string;
  id: string;
  selected: boolean;
  category: string;
  groupName: string;
  orderIndex: number;
  tooltip?: string;
  columnGroupName?: string;
};

export type ColumnChooserModalProps = {
  open: boolean;
  onAccept: (columns: Array<ColumnChooserColumn>, save?: boolean) => void;
  onCancel: VoidFunction;
  columns: Array<ColumnChooserColumn>;
  showCategory?: boolean;
  showApplyAndSave?: boolean;
  allowGroupChange?: boolean;
  defaultGroups?: string[];
};
