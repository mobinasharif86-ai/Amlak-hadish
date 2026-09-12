// این فایل دیگر مستقیم با Supabase صحبت نمی‌کند. به‌جای آن، درخواست‌ها را به
// همان Worker خودمان (worker.js) می‌فرستد که کلید محرمانه را فقط سمت سرور نگه می‌دارد.

export async function fetchPublicAdvisors() {
  const res = await fetch("/api/public-advisors");
  if (!res.ok) throw new Error("خطا در دریافت لیست مشاوران.");
  const json = await res.json();
  return json.advisors || [];
}

export async function loadDataWithCreds(creds) {
  const res = await fetch("/api/state", {
    headers: { "X-Auth": JSON.stringify(creds) },
  });
  if (res.status === 401) {
    const err = new Error("رمز عبور اشتباه است.");
    err.unauthorized = true;
    throw err;
  }
  if (!res.ok) throw new Error("اتصال به سرور برقرار نشد.");
  const json = await res.json();
  return json.data;
}

export async function saveDataWithCreds(creds, value) {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: { "X-Auth": JSON.stringify(creds), "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error("ذخیره‌سازی ناموفق بود.");
  return true;
}
