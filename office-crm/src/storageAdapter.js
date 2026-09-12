import { supabase, supabaseInitError } from "./supabaseClient";

const ROW_ID = 1;
const TABLE = "app_state";

export async function loadData() {
  if (!supabase) throw new Error(supabaseInitError || "اتصال به دیتابیس برقرار نشد.");
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) throw error;
  return data ? data.data : null;
}

export async function saveData(value) {
  if (!supabase) throw new Error(supabaseInitError || "اتصال به دیتابیس برقرار نشد.");
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: value, updated_at: new Date().toISOString() });

  if (error) throw error;
  return true;
}
