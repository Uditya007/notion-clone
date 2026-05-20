import { createClient } from './supabase/server';

export async function getGoogleToken() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: tokens, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !tokens) return null;

  const now = new Date();
  const expiresAt = new Date(tokens.expires_at);

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000 && tokens.refresh_token) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.access_token;
        const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

        await supabase
          .from('google_tokens')
          .update({
            access_token: newAccessToken,
            expires_at: newExpiresAt,
          })
          .eq('user_id', user.id);

        return newAccessToken;
      }
    } catch (err) {
      console.error('Failed to refresh Google token:', err);
    }
  }

  return tokens.access_token;
}
