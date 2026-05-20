import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/workspace';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const user = data.session.user;
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;
      const expiresAt = data.session.expires_at 
        ? new Date(data.session.expires_at * 1000).toISOString() 
        : new Date(Date.now() + 3600 * 1000).toISOString();

      // If this was a Google sign-in and we received provider tokens, save/update them in google_tokens
      if (user && providerToken) {
        await supabase
          .from('google_tokens')
          .upsert({
            user_id: user.id,
            access_token: providerToken,
            refresh_token: providerRefreshToken || null,
            expires_at: expiresAt,
            scope: 'email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify',
            email: user.email,
          }, { onConflict: 'user_id' });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
