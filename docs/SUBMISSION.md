# Dayweave

**A day-ahead planning agent that makes room for rest, coffee, and lunch—with evidence you can inspect and changes you approve.**

[Working app](https://jsohlot.github.io/dayweave/) · [106-second demo](https://jsohlot.github.io/dayweave/demo.html) · [GitHub](https://github.com/jsohlot/dayweave) · [Executed verification](VERIFICATION.md)

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

The provider checks availability again before insertion, uses stable event IDs for retries, and reconciles existing events before logging. Uncertain workbook creation can recover without creating a second workbook. Errors and incomplete logging remain visible. Model output cannot call mutation tools or replace the validated schedule. Credentials stay in page memory.

**Executed evidence:** 69 automated tests passed, production build and hosted CI passed, and a separate reviewer verified the principal recovery and isolation fixes. Real Google tests covered Gmail and Calendar reads, Sheets preference saving, a Calendar lunch event with an activity row, and repeated approval without duplicate event or log creation. Real Gemini requests succeeded on synthetic inputs. The video shows a fictional walkthrough and a separately labeled live Google result; its measured duration is 106.02 seconds.

## What makes it useful

Dayweave turns scattered context into small, concrete actions instead of another summary. Evidence and approval sit beside the recommendations, so the user can understand and change the plan. It is responsive and includes full-day, early-start, and sparse-history demonstrations.

## Prototype limits

This is planning software, not a validated predictor of health or nutritional needs. Purchases do not establish consumption. Meeting density does not establish a need for extra carbohydrates. Calendar checks cover the primary calendar; external edits can race the final availability check. Concurrent writes across separate devices are not globally transactional. Google OAuth is in testing mode; the public fictional demo works without account access, while other connected users need an authorized test account or their own client. Gemini requires a session key.

## Hackathon entry

Built for the [Multi-App AI Agent Hackathon](https://multiappagenthackathon.com/), September 13, 2026. The official deadline is 4:00 PM Pacific. The [submission form](https://docs.google.com/forms/d/e/1FAIpQLSclU5z63xMUenxypmW_PTcgXIGgwnENY_mgX87mPeoAWOTIoA/viewform) requests team email addresses and the repository URL. The README links the app, demonstration, setup, and reliability evidence. Submission confirmation is recorded separately after the form accepts the entry.
