# Zoom summary accuracy: live acceptance test

The existing webhook imports Zoom AI Companion summaries. It does not import a verbatim transcript. Signed synthetic webhook tests prove delivery, isolation, ordering and publication rules; they cannot prove Zoom transcribed a real lesson accurately.

The owner confirmed Zoom Workplace Pro on 2026-10-13. Verify the host's actual settings and license before testing; no live Zoom lesson has been validated yet.

## What we need from the owner

1. A public HTTPS staging deployment with PostgreSQL and email configured, plus a verified staff account and one synthetic student. Configure Zoom's account ID and webhook Secret Token directly in server settings, never in chat or the repository.
2. A Zoom account administrator to enable the app's subscriptions: `meeting.started`, `meeting.summary_completed`, `meeting.summary_updated`. Validate `https://YOUR_STAGING_HOST/api/webhooks/zoom` in the app.
3. Meeting Summary and Generate transcript enabled for the licensed host, with the correct speaking language. Under Meeting → In Meeting (Advanced) → Meeting transcript, allow the host to view/download the transcript and choose the desired retention.
4. One 10-minute mock lesson with an adult and a synthetic learner name, plus its scheduled start time and Zoom meeting link/ID. Add these details to the staff portal before starting. No real child data is needed.
5. The resulting transcript export and generated summary so we can compare them with the script below. Keep both private. Provide access through the workspace or approved account tools; do not post meeting tokens or sensitive student material in chat.

## Known-answer mock lesson

Say these points naturally, including the explicit correction:

- “Our learner today is Demo Learner. We are practising equivalent fractions.”
- “One half is equal to two quarters. One half plus two quarters equals one whole.”
- “Six times seven is forty. I need to correct that: six times seven is forty-two.”
- “The learner used fraction strips successfully but still needs practice explaining the denominator.”
- “Homework task one: complete questions one through four on the equivalent-fractions worksheet.”
- “Homework task two: draw three different ways to show one half.”
- State one exact due date and time, including the time zone, and write it down before the meeting.
- “The teacher will review the submitted worksheet and discuss it in the next class.”

Avoid breakout rooms for this first test. Start the summary/transcript at the beginning, confirm Zoom indicates it is active, then end the meeting normally.

## Compare content and delivery separately

| Check | Pass criterion |
| --- | --- |
| Transcript | The spoken quantities, equation, explicit correction, both homework tasks and exact due date are preserved; speaker attribution is reasonable |
| Summary | Final multiplication answer is 42; fraction equivalence is correct; the remaining difficulty and both homework tasks are represented without invented mastery or extra tasks |
| Matching | The imported draft belongs to the exact synthetic learner and this meeting occurrence |
| Privacy | Parent/student cannot see the draft before publication; another test family never sees this lesson |
| Teacher workflow | Teacher can correct the draft, save it, then publish the reviewed version |
| Update | A later Zoom summary update creates a newer private draft and preserves the previously published copy |
| Retry | Duplicate signed delivery does not create another summary; an unmatched occurrence stays in the staff review queue |

Record the meeting time/UUID and result of each check, but keep raw transcript text out of app logs and issue/PR descriptions. A failed content check needs teacher correction and another mock lesson; do not describe the AI as error-free because delivery succeeded.

## Full transcript import is a separate extension

Zoom's retained transcript API is `GET /meetings/{meetingId}/transcript` with the past meeting instance UUID, a suitable OAuth scope such as `cloud_recording:read:meeting_transcript` (or its admin equivalent), and a host who can download the transcript. This release does not retrieve that API or store OAuth credentials. Enable it only when a full transcript feature is requested and the appropriate app access is configured.

Sources checked on 2026-10-13: [Zoom Meeting Summary requirements](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0058013), [current transcript settings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0085668), [meeting webhook payloads](https://developers.zoom.us/docs/api/meetings/events/), [transcript API](https://developers.zoom.us/docs/api/meetings/).
