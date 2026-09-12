// این فایل به تابع سرور روی خود Supabase وصل می‌شود (نه مستقیم به دیتابیس).
// آن تابع کلید محرمانه را خودش دارد و رمز عبور را قبل از هر کاری چک می‌کند.

const API_BASE = "https://yoedmernxkhmrvhcbjub.supabase.co/functions/v1/office-api";

async function readErrorMessage(res) {
  try {
    const body = await res.json();
    if (body && body.error) return body.error;
  } catch {
    // نادیده گرفتن؛ پاسخ JSON نبود
  }
  return `کد خطا: ${res.status}`;
}

export async function fetchPublicAdvisors() {
  const res = await fetch(`${API_BASE}/public-advisors`);
  if (!res.ok) throw new Error("خطا در دریافت لیست مشاوران — " + (await readErrorMessage(res)));
  const json = await res.json();
  return json.advisors || [];
}

export async function loadDataWithCreds(creds) {
  const res = await fetch(`${API_BASE}/state`, {
    headers: { "X-Auth": JSON.stringify(creds) },
  });
  if (res.status === 401) {
    const err = new Error("رمز عبور اشتباه است.");
    err.unauthorized = true;
    throw err;
  }
  if (!res.ok) throw new Error("اتصال به سرور برقرار نشد — " + (await readErrorMessage(res)));
  const json = await res.json();
  return json.data;
}

export async function saveDataWithCreds(creds, value) {
  const res = await fetch(`${API_BASE}/state`, {
    method: "POST",
    headers: { "X-Auth": JSON.stringify(creds), "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error("ذخیره‌سازی ناموفق بود — " + (await readErrorMessage(res)));
  return true;
}
