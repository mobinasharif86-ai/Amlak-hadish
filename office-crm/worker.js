/**
 * این Worker یک لایه‌ی امن بین سایت و دیتابیسه.
 * کلید محرمانه‌ی Supabase (service role) فقط همین‌جا (سمت سرور) استفاده می‌شه
 * و هیچ‌وقت به مرورگر کاربر فرستاده نمی‌شه.
 *
 * مسیرها:
 *  GET  /api/public-advisors  -> لیست نام مشاوران فعال (بدون رمز) برای صفحه‌ی ورود
 *  GET  /api/state            -> خواندن کل داده (نیاز به هدر X-Auth معتبر)
 *  POST /api/state            -> ذخیره‌ی کل داده (نیاز به هدر X-Auth معتبر)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/public-advisors" && request.method === "GET") {
      return handlePublicAdvisors(env);
    }
    if (url.pathname === "/api/state") {
      return handleState(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchState(env) {
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL روی سرور تنظیم نشده است.");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY روی سرور تنظیم نشده است.");
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_state?id=eq.1&select=data`, {
    headers: sbHeaders(env),
  });
  if (!res.ok) throw new Error("Supabase read failed: " + res.status);
  const rows = await res.json();
  return rows && rows[0] ? rows[0].data : null;
}

async function saveState(env, data) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/app_state`, {
    method: "POST",
    headers: { ...sbHeaders(env), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: 1, data, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error("Supabase write failed: " + res.status);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handlePublicAdvisors(env) {
  try {
    const data = await fetchState(env);
    const advisors = ((data && data.advisors) || [])
      .filter((a) => a.active)
      .map((a) => ({ id: a.id, name: a.name }));
    return json({ advisors });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function checkCredentials(data, creds) {
  if (!data || !creds) return false;
  if (creds.role === "manager") {
    return creds.password === (data.managerPassword || "");
  }
  const a = (data.advisors || []).find((x) => x.id === creds.id);
  return a ? creds.password === (a.password || "") : false;
}

async function handleState(request, env) {
  let creds = null;
  try {
    creds = JSON.parse(request.headers.get("X-Auth") || "null");
  } catch {
    creds = null;
  }

  let data;
  try {
    data = await fetchState(env);
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }

  if (!checkCredentials(data, creds)) {
    return json({ error: "unauthorized" }, 401);
  }

  if (request.method === "GET") {
    return json({ data });
  }

  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid body" }, 400);
    }
    try {
      await saveState(env, body);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}
