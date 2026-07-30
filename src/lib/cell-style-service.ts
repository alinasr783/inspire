import { createClient } from "@/lib/supabase/client";

export interface CellStyle {
  id?: string;
  user_id: string;
  table_name: string;
  element_type: "table" | "column" | "row" | "cell";
  element_key: string;
  text_color?: string | null;
  background_color?: string | null;
  font_size?: number | null;
  font_weight?: string | null;
  border_style?: string | null;
  border_color?: string | null;
  border_width?: string | null;
  text_align?: string | null;
  vertical_align?: string | null;
}

export async function loadCellStyles(userId: string, tableName: string): Promise<CellStyle[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cell_styles")
    .select("*")
    .eq("user_id", userId)
    .eq("table_name", tableName);
  if (error) throw error;
  return data ?? [];
}

export async function upsertCellStyle(style: Omit<CellStyle, "id">): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("cell_styles").upsert(style, {
    onConflict: "user_id,table_name,element_type,element_key",
  });
  if (error) throw error;
}

export async function deleteCellStyle(
  userId: string,
  tableName: string,
  elementType: string,
  elementKey: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("cell_styles")
    .delete()
    .eq("user_id", userId)
    .eq("table_name", tableName)
    .eq("element_type", elementType)
    .eq("element_key", elementKey);
  if (error) throw error;
}
