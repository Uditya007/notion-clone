# Cora Deployment & Launch Checklist

This guide provides the complete step-by-step checklist to deploy Cora (Next.js + Supabase) successfully in production on Vercel.

---

## 1. Supabase Schema and RLS Policies
Ensure your Supabase project contains all required tables, triggers, and Row Level Security (RLS) policies.

### Tables Required
Verify that you have run the full schema SQL script in your **Supabase SQL Editor** to create:
* `profiles`
* `pages`
* `tasks`
* `conversations`
* `messages`
* `google_tokens`
* `automations`
* `databases`
* `db_columns`
* `db_rows`

### Enable Row Level Security (RLS)
Ensure RLS is enabled for every single table:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_rows ENABLE ROW LEVEL SECURITY;
```

---

## 2. Supabase Storage Bucket Setup
Ensure you have created the public storage bucket for custom page covers:
1. Open the **[Supabase Console](https://supabase.com/dashboard)**.
2. Select **Storage** in the left navigation sidebar.
3. Click **New bucket** and name it `covers`.
4. Toggle **Public bucket** to **ON** 🟢 (to ensure cover images load instantly over the CDN).
5. Click **Save**.

---

## 3. Google OAuth & Google Cloud Settings
For Google Sign-in to function in both production and development:
1. Go to your **[Google Cloud Console](https://console.cloud.google.com)**.
2. Select your project and navigate to **APIs & Services** -> **Credentials**.
3. Under **OAuth 2.0 Client IDs**, edit your Web Client ID.
4. Add your production domain under **Authorized JavaScript origins**:
   * `https://your-app-domain.vercel.app`
5. Add the Supabase Auth callback URI under **Authorized redirect URIs**:
   * `https://umldmrmcmaztjmyjsqcq.supabase.co/auth/v1/callback`
6. In **Supabase Authentication -> Providers -> Google**:
   * Toggle Google Provider to **ON**.
   * Enter the **Google Client ID** and **Client Secret**.
   * Click **Save**.

---

## 4. Vercel Production Environment Variables
Go to your **Vercel Dashboard** -> **Cora** Project -> **Settings** -> **Environment Variables**, and configure the following keys exactly:

| Variable Name | Production Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://umldmrmcmaztjmyjsqcq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Supabase anon public key)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Your Supabase service role secret key)* |
| `GOOGLE_GENERATIVE_AI_API_KEY` | *(Your Google Gemini / Claude API key)* |
| `GOOGLE_CLIENT_ID` | `your_google_client_id_here` |
| `GOOGLE_CLIENT_SECRET` | `your_google_client_secret_here` |

> [!WARNING]
> Do NOT append `/rest` to `NEXT_PUBLIC_SUPABASE_URL`. It must end with `.supabase.co`.

---

## 5. Post-Deployment Sanity Test
Once Vercel finishes the build, navigate to your live domain and verify:
1. **Sign Up / Login**: Navigate to the login page. Sign up with an email/password account and verify receipt of your confirmation email, or sign in using the **"Continue with Google"** button.
2. **Page Autosave**: Create a new page. Type inside the editor and verify that the header autosave state updates to "Saved" after 1 second.
3. **Cover Uploads**: Click "Upload custom cover", choose a JPG/PNG/WebP, and verify that it uploads to the storage bucket and displays as the page cover.
4. **AI Assistant**: Open the AI Panel and prompt the assistant. Verify that the messages stream smoothly.
