export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production'
  const port = Number(env.PORT || 4504)
  const origin = env.APP_ORIGIN || `http://127.0.0.1:${port}`
  const parsed = new URL(origin)
  if (parsed.origin !== origin || parsed.username || parsed.password) throw new Error('APP_ORIGIN must be an origin without a path or trailing slash.')
  if (production && parsed.protocol !== 'https:') throw new Error('Production requires an HTTPS APP_ORIGIN.')
  if (production && (!env.DATABASE_URL || !env.SMTP_URL || !env.MAIL_FROM)) {
    throw new Error('Production portal requires DATABASE_URL, SMTP_URL and MAIL_FROM. Configure these before deploying.')
  }
  return { production, port, origin, host: env.HOST || (production ? '0.0.0.0' : '127.0.0.1'),
    databaseUrl: env.DATABASE_URL, dataDir: env.LOCAL_DATA_DIR || '.data/postgres',
    smtpUrl: env.SMTP_URL, mailFrom: env.MAIL_FROM, mailDir: '.data/mail',
    // Enable only behind the known Render proxy; never trust arbitrary forwarded headers.
    trustProxy: env.TRUST_PROXY_HOPS === '1' ? 1 : false,
    zoomSecret: env.ZOOM_WEBHOOK_SECRET, zoomAccount: env.ZOOM_ACCOUNT_ID }
}
