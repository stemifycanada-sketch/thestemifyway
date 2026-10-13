import { createHmac, timingSafeEqual } from 'node:crypto'
import express from 'express'
import { digest, HttpError, audit } from './security.mjs'

const accepted = new Set(['meeting.started', 'meeting.summary_completed', 'meeting.summary_updated'])
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
export function mountZoom(app, db, config) {
  app.post('/api/webhooks/zoom', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
    if (!config.zoomSecret || !config.zoomAccount) throw new HttpError(503, 'Zoom integration is not configured.')
    const timestamp = req.headers['x-zm-request-timestamp'], signature = req.headers['x-zm-signature']
    if (typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || !Buffer.isBuffer(req.body)) throw new HttpError(401, 'Invalid webhook signature.')
    const expected = `v0=${createHmac('sha256', config.zoomSecret).update(`v0:${timestamp}:`).update(req.body).digest('hex')}`
    if (typeof signature !== 'string' || !/^v0=[a-f0-9]{64}$/.test(signature) || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new HttpError(401, 'Invalid webhook signature.')
    let event
    try { event = JSON.parse(req.body.toString('utf8')) } catch { throw new HttpError(400, 'Invalid webhook payload.') }
    if (!event || typeof event !== 'object' || Array.isArray(event)) throw new HttpError(400, 'Invalid webhook payload.')
    if (event.event === 'endpoint.url_validation') {
      const plainToken = event.payload?.plainToken
      if (typeof plainToken !== 'string' || plainToken.length > 1000) throw new HttpError(400, 'Invalid verification token.')
      return res.json({ plainToken, encryptedToken: createHmac('sha256', config.zoomSecret).update(plainToken).digest('hex') })
    }
    if (event.payload?.account_id !== config.zoomAccount) throw new HttpError(403, 'Unrecognized Zoom account.')
    if (!accepted.has(event.event)) return res.status(204).end()
    const obj = event.payload?.object
    const uuid = obj?.meeting_uuid || obj?.uuid
    if (typeof uuid !== 'string' || !uuid || uuid.length > 200 || !Number.isFinite(event.event_ts)) throw new HttpError(400, 'Missing meeting identity.')
    // Zoom may re-sign the same delivery. Key the event by its signed payload, not the HTTP timestamp.
    const id = digest(JSON.stringify(event))
    await db.transaction(async tx => {
      await tx.query(`INSERT INTO zoom_events(id,event_type,meeting_uuid,payload) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING`, [id, event.event, uuid, JSON.stringify(event)])
      await tx.query(`INSERT INTO integration_state(key,value) VALUES('last_received',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, [new Date().toISOString()])
    })
    // Acknowledge only after durable receipt; a worker imports the notes independently.
    res.status(202).json({ received: true })
  })
}
function text(value) { return typeof value === 'string' ? value.trim() : '' }
function summaryParts(obj) {
  const summary = text(obj.summary_content) || [text(obj.summary_overview), ...(Array.isArray(obj.summary_details) ? obj.summary_details.map(x => [text(x.label), text(x.summary)].filter(Boolean).join('\n')) : [])].filter(Boolean).join('\n\n')
  const nextSteps = Array.isArray(obj.next_steps) ? obj.next_steps.map(x => typeof x === 'string' ? x : text(x?.summary)).filter(Boolean).join('\n') : text(obj.next_steps)
  if (!summary || summary.length > 30000 || nextSteps.length > 10000) throw new Error('Unsupported summary shape or size')
  return { summary, nextSteps }
}
export async function processZoomEvents(db, limit = 20) {
  for (let i = 0; i < limit; i++) {
    const processed = await db.transaction(async tx => {
      const { rows: [event] } = await tx.query(`SELECT * FROM zoom_events WHERE status IN ('pending','unmatched') AND next_attempt<=now() AND attempts<12 ORDER BY received_at FOR UPDATE SKIP LOCKED LIMIT 1`)
      if (!event) return false
      await tx.query('SAVEPOINT import_event')
      try {
        const obj = event.payload.payload.object
        let lesson = (await tx.query('SELECT * FROM classes WHERE zoom_uuid=$1 FOR UPDATE', [event.meeting_uuid])).rows[0]
        if (!lesson) {
          const meetingId = String(obj.meeting_id || obj.id || '')
          const startsAt = obj.meeting_start_time || obj.start_time
          if (meetingId && validDate(startsAt)) {
            // Never bind using a title, participant name or a recurring meeting ID alone.
            const matches = await tx.query(`SELECT * FROM classes WHERE zoom_meeting_id=$1 AND zoom_uuid IS NULL AND status<>'cancelled'
              AND abs(extract(epoch FROM (starts_at-$2::timestamptz)))<=900 FOR UPDATE`, [meetingId, startsAt])
            if (matches.rows.length === 1) {
              lesson = matches.rows[0]
              await tx.query('UPDATE classes SET zoom_uuid=$1,version=version+1 WHERE id=$2', [event.meeting_uuid, lesson.id])
            }
          }
        }
        if (!lesson) {
          await tx.query(`UPDATE zoom_events SET status='unmatched',attempts=attempts+1,next_attempt=now()+interval '1 hour' WHERE id=$1`, [event.id])
          return true
        }
        if (event.event_type !== 'meeting.started') {
          const parts = summaryParts(obj)
          const modified = validDate(obj.summary_last_modified_time) ? obj.summary_last_modified_time : new Date(Number(event.payload.event_ts)).toISOString()
          await tx.query(`INSERT INTO lesson_notes(class_id,draft_summary,draft_next_steps,source,zoom_modified_at) VALUES($1,$2,$3,'Zoom AI Companion',$4)
            ON CONFLICT(class_id) DO UPDATE SET draft_summary=EXCLUDED.draft_summary,draft_next_steps=EXCLUDED.draft_next_steps,source=EXCLUDED.source,
            zoom_modified_at=EXCLUDED.zoom_modified_at,version=lesson_notes.version+1,updated_at=now()
            WHERE lesson_notes.zoom_modified_at IS NULL OR lesson_notes.zoom_modified_at<EXCLUDED.zoom_modified_at`, [lesson.id, parts.summary, parts.nextSteps, modified])
          await audit(tx, null, 'zoom_summary_received', lesson.id)
        }
        await tx.query(`UPDATE zoom_events SET status='processed',payload='{}'::jsonb,attempts=attempts+1,processed_at=now() WHERE id=$1`, [event.id])
        await tx.query(`INSERT INTO integration_state(key,value) VALUES('last_processed',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, [new Date().toISOString()])
      } catch {
        // Preserve the receipt for retry; never log meeting text or raw provider errors.
        await tx.query('ROLLBACK TO SAVEPOINT import_event')
        await tx.query(`UPDATE zoom_events SET attempts=attempts+1,status=CASE WHEN attempts>=4 THEN 'failed' ELSE 'pending' END,next_attempt=now()+interval '5 minutes' WHERE id=$1`, [event.id])
      }
      return true
    })
    if (!processed) break
  }
}
export async function maintenance(db) {
  await db.query('DELETE FROM sessions WHERE expires_at<=now()')
  await db.query('DELETE FROM auth_tokens WHERE expires_at<=now()')
  await db.query('DELETE FROM rate_limits WHERE expires_at<=now()')
  await db.query(`UPDATE zoom_events SET payload='{}'::jsonb,status='failed' WHERE status<>'processed' AND received_at<now()-interval '7 days'`)
  await db.query(`DELETE FROM zoom_events WHERE received_at<now()-interval '30 days'`)
}
