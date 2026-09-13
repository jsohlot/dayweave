# Dayweave

**A day-ahead planning agent that makes room for rest, coffee, and lunch—with evidence you can inspect and changes you approve.**

[Working app](https://jsohlot.github.io/dayweave/) · [90-second continuous demo](https://jsohlot.github.io/dayweave/demo.html) · [GitHub](https://github.com/jsohlot/dayweave) · [Executed verification](VERIFICATION.md)

## Problem and value

A calendar tells you where to be, but it does not protect the routines around those commitments. An early meeting changes tonight’s preparation. Coffee competes with a busy morning. Lunch disappears between meetings. The clues are spread across an inbox, a calendar, and personal preferences.

Dayweave combines those clues into tomorrow’s plan. It works backward from a chosen sleep target and morning buffers, uses timestamped coffee purchases when there is enough history, and finds a complete lunch opening around the user’s preferred time. Every suggestion shows its evidence. The user selects the changes, reviews exact times, and approves execution.

## Three external apps

| App | Role |
| --- | --- |
| Gmail | Reads recent relevant receipts. Qualified purchase timestamps inform coffee timing; missing timestamps remain missing. |
| Google Calendar | Reads the owned primary calendar, checks availability, and creates only selected and approved events. |
| Google Sheets | Saves explicit routine preferences and records successful action outcomes in the app-created workbook. |

## System and reliability brief

The Gemini agent uses a bounded read-only tool loop to inspect the validated plan and relevant observations, then selects a focus with supporting evidence IDs. The app validates the selection. Deterministic scheduling owns times, time zones, conflicts, and mutations. A separate approval dialog lists Calendar events and Sheets writes before execution.

The provider checks availability again before insertion, uses stable event IDs for retries, and reconciles existing events before logging. Uncertain workbook creation searches for the original workbook. If it remains missing, replacement requires explicit confirmation with a warning about possible late discovery. Same-account reconnection preserves unfinished actions for renewed review. Errors and incomplete logging remain visible. Model output cannot call mutation tools or replace the validated schedule. Credentials stay in page memory.

**Executed evidence:** 128 automated tests and the production build passed after the release review fixed late-wake lunch scheduling, same-account reconnection, and explicit workbook recovery. Independent review passed. Real Google tests covered Gmail/Calendar reads, Sheets preference saving, an approved lunch event and activity row, and duplicate-safe retry; these are separate from the video. The new 89.51-second continuous product recording leads with sleep and coffee evidence, a real Gemini review, approval and duplicate prevention. Optional nutrition suggestions and the monthly calculator occupy a short later segment. Sample data and simulated actions are labeled; a later AI quota fallback is visible while planning and nutrition remain usable. Wearable integration is planned and not connected. Final release checks are recorded in the linked verification brief.

## What makes it useful

Dayweave turns scattered context into small, concrete actions instead of another summary. Evidence and approval sit beside the recommendations, so the user can understand and change the plan. It is responsive and includes full-day, early-start, and sparse-history demonstrations.

## Prototype limits

This is planning software, not a validated predictor of health or nutritional needs. Purchases do not establish consumption. Meeting density does not establish a need for extra carbohydrates. Calendar checks cover the primary calendar; external edits can race the final availability check. Concurrent writes across separate devices are not globally transactional. Google OAuth is in testing mode; the public fictional demo works without account access, while other connected users need an authorized test account or their own client. Gemini requires a session key.

## Hackathon entry

Built for the [Multi-App AI Agent Hackathon](https://multiappagenthackathon.com/), September 13, 2026. The official deadline is 4:00 PM Pacific. The [submission form](https://docs.google.com/forms/d/e/1FAIpQLSclU5z63xMUenxypmW_PTcgXIGgwnENY_mgX87mPeoAWOTIoA/viewform) requests team email addresses and the repository URL. The README links the app, demonstration, setup, and reliability evidence. The solo-project entry was submitted at approximately 12:24 PM Pacific and the form confirmed: “Your response has been recorded.”
