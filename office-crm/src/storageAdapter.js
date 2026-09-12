import { supabase } from "./supabaseClient";

// همه‌ی داده‌های دفتر (فایل‌ها، مشتری‌ها، پیگیری‌ها، ...) در یک ردیف واحد
// از جدول app_state به صورت JSON نگهداری می‌شود. ساده‌ترین راه برای نسخه اول
// و کاملاً کافی برای یک دفتر با چند مشاور.
const ROW_ID = 1;
const TABLE = "app_state";

export async function loadData() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) throw error;
  return data ? data.data : null;
}

export async function saveData(value) {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: value, updated_at: new Date().toISOString() });

  if (error) throw error;
  return true;
}
