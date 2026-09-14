export const COLUMN_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "multi_select",
  "checkbox",
  "textarea",
] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

export type ColumnConfig = {
  id: string;
  key: string;
  label_ar: string;
  label_en: string;
  type: ColumnType;
  options: string[] | null;
  sort_order: number;
  enabled: boolean;
  is_builtin: boolean;
  created_at: string;
};

export const OPTION_TYPES: ColumnType[] = ["select", "multi_select"];

export type UpdateColumnInput = {
  key: string;
  label_ar: string;
  label_en: string;
  type: ColumnType;
  options?: string[] | string;
  enabled?: boolean;
};
