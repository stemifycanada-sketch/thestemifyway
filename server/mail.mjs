import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
export async function createMailer(config) {
  if (config.smtpUrl) {
    const { default: nodemailer } = await import('nodemailer')
    const transport = nodemailer.createTransport(config.smtpUrl, { from: config.mailFrom })
    return { send: message => transport.sendMail(message), close: () => transport.close() }
  }
  if (config.production) throw new Error('Email delivery is required in production.')
  return { async send(message) {
    await mkdir(config.mailDir, { recursive: true, mode: 0o700 })
    await writeFile(resolve(config.mailDir, `${Date.now()}-${randomUUID()}.json`), JSON.stringify(message, null, 2), { mode: 0o600 })
  }, close() {} }
}
export async function sendAccountEmail(mailer, config, email, purpose, secret) {
  const action = purpose === 'verify' ? 'Verify your email' : 'Reset your password'
  // Fragment keeps the one-time secret out of HTTP access logs and Referer headers.
  const url = `${config.origin}/portal#${purpose}=${secret}`
  try { await mailer.send({ to: email, subject: `${action} — STEMIFY`,
    text: `${action}\n\n${url}\n\nThis link expires in ${purpose === 'verify' ? '24 hours' : '30 minutes'} and can be used once. If you did not request this, ignore this email.` }) }
  catch { throw new Error('Account email could not be sent') }
}
