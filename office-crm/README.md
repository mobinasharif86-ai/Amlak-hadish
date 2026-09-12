# دفتر املاک — راهنمای انتشار روی اینترنت

این پروژه یک وب‌اپ آماده است. برای اینکه همه (مدیر و مشاوران) از هر جا با یک لینک واقعی وارد شوند، دو کار لازم است: ساخت یک دیتابیس رایگان (Supabase) و انتشار سایت (Vercel). هر دو رایگان‌اند و نیازی به کارت اعتباری ندارند.

## مرحله ۱ — ساخت دیتابیس در Supabase


1. به [supabase.com](https://supabase.com) برو و با ایمیل ثبت‌نام کن.
2. یک پروژه جدید بساز (New Project) — یک رمز عبور دیتابیس هم از تو می‌خواهد، هرچه دلت خواست بگذار و جایی یادداشت کن.
3. بعد از ساخته‌شدن پروژه، از منوی سمت چپ برو به **SQL Editor** و این کد را اجرا کن (دکمه Run):

```sql
create table app_state (
  id int primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table app_state enable row level security;

create policy "anyone can read"
  on app_state for select
  using (true);

create policy "anyone can write"
  on app_state for insert
  with check (true);

create policy "anyone can update"
  on app_state for update
  using (true);
```

> این تنظیمات یعنی هر کسی که لینک سایت را دارد می‌تواند داده را بخواند/بنویسد — دقیقاً مثل رفتار فعلی اپ (رمز عبور در خود اپ چک می‌شود، نه در دیتابیس). برای یک دفتر کوچک با تیم مشخص کافی است.

4. از منوی **Project Settings → API** دو مقدار را بردار:
   - **Project URL**
   - **anon public key**

## مرحله ۲ — بارگذاری پروژه در گیت‌هاب

1. یک ریپازیتوری جدید در [github.com](https://github.com) بساز (مثلاً به نام `daftar-emlak`).
2. **محتوای داخل این پوشه را** (نه خود پوشه به‌عنوان یک زیرپوشه) در ریشه‌ی ریپازیتوری آپلود کن — یعنی بعد از آپلود، فایل `package.json` باید مستقیماً در ریشه‌ی ریپو دیده شود، نه داخل یک پوشه‌ی دیگر.

## مرحله ۳ — انتشار (دو گزینه)

### گزینه الف: Cloudflare Workers (اگر Vercel از ایران کار نکرد)

1. به [dash.cloudflare.com](https://dash.cloudflare.com) برو → **Workers & Pages** → **Create** → پروژه‌ات را به همین ریپازیتوری گیت‌هاب وصل کن.
2. فایل‌های این پوشه را **مستقیم در ریشه‌ی ریپازیتوری** آپلود کن (نه داخل یک پوشه‌ی دیگر با اسم `office-crm`؛ فایل `package.json` باید مستقیم در ریشه‌ی ریپو باشد). این نکته مهم است چون قبلاً همین موضوع باعث خطا شد.
3. در تنظیمات پروژه، بخش **Settings → Build**:
   - **Build command**: `npm install && npm run build`
   - **Build output directory**: `dist`
   - **Deploy command**: `npx wrangler deploy` (معمولاً پیش‌فرض همین است)
4. در **Settings → Environment Variables**، این دو مقدار را به‌عنوان **Build variable** اضافه کن (نه فقط runtime):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. یک بار Deploy کن. اگر لاگ درست باشد، باید ببینی که `npm install` و `vite build` واقعاً اجرا می‌شوند و حجم آپلود شده بیشتر از چند کیلوبایت است (نه ۰.۳۳ کیلوبایت).
6. آدرس نهایی چیزی شبیه `https://amlak-hadish.<account>.workers.dev` خواهد بود.

فایل `wrangler.jsonc` همین پوشه از قبل درست تنظیم شده (خروجی build را از `dist` می‌خواند)، نیازی به دست‌زدن به آن نیست.

### گزینه ب: Vercel (اگر بعداً با شماره خارجی یا VPN توانستی ثبت‌نام کنی)

همان مراحل قبلی: پروژه را وصل کن، دو متغیر Supabase را در Environment Variables بگذار، Deploy بزن.

## بعد از انتشار

- اولین ورود: فقط گزینه «مدیر دفتر» با رمز پیش‌فرض `1234` را می‌بینی. حتماً همان اول از بخش «مشاوران» رمز مدیر را عوض کن و مشاوران را با نام و رمز دلخواه اضافه کن.
- هر تغییری که در کد بدهی و در گیت‌هاب push کنی، Vercel به‌صورت خودکار نسخه جدید را منتشر می‌کند.
- برای تست محلی روی کامپیوتر خودت (قبل از انتشار): `npm install` سپس `npm run dev`، بعد از ساخت فایل `.env` طبق نمونه `.env.example`.
