export function hostedContentSecurityPolicy(supabaseUrl: string | undefined, development = false): string {
  let authOrigin = '';
  if (supabaseUrl) {
    const url = new URL(supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('VITE_SUPABASE_URL must be an HTTPS project URL.');
    authOrigin = url.origin;
  }
  return [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:", "font-src 'self'",
    `connect-src 'self'${authOrigin ? ` ${authOrigin}` : ''}${development ? ' ws://127.0.0.1:* ws://localhost:*' : ''}`,
    'frame-src https://*.vercel.run', "object-src 'none'", "base-uri 'none'", "form-action 'none'"
  ].join('; ');
}
