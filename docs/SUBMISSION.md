# Dayweave submission materials

Prepared against the [official Multi-App AI Agent Hackathon page](https://multiappagenthackathon.com/), checked September 13, 2026. The site requires one response per project/team, every team member’s email, an accessible GitHub repository, and an accessible video no longer than two minutes. The submission form is linked from the calendar event and closes at **4:00 PM Pacific on September 13, 2026**. Actual form fields were not inspected; the copy below is modular rather than a claimed reproduction of the form.

**Status:** Product copy is ready to adapt. Live Google integrations, successful Gemini execution on the submitted revision, public access, video export and final submission must be evidenced separately. Do not turn an unfilled evidence slot into a success claim.

## Project name

Dayweave

## One-line description

A day-ahead planning agent that connects your receipts, calendar and routines to make room for rest, coffee and lunch—with evidence you can inspect and changes you approve.

## Problem and value

A calendar can tell you where to be without helping you make room for yourself. An early meeting changes tonight’s preparation. A familiar coffee stop competes with a busy morning. Lunch disappears between commitments. The clues are spread across an inbox, a calendar and personal routines.

Dayweave brings those clues into one plan for tomorrow. It works backward from your chosen sleep target and morning buffers, uses timestamped coffee purchases when there is enough history, and finds a complete lunch opening around your preferred time. Each suggestion explains its evidence. You choose the small changes worth making, then approve the exact Calendar events and Sheets activity writes.

## What we built

Dayweave is a responsive browser app with two explicit modes: a synthetic demo that works immediately, and a Google-connected workflow. Its three external apps have distinct jobs:

| External app | Role in the workflow |
| --- | --- |
| Gmail | Reads bounded, recent, relevant receipt messages. Usable purchase timestamps inform coffee timing; missing purchase times remain missing. Gmail is read-only. |
| Google Calendar | Reads commitments from the owned primary calendar, identifies available windows, and creates only the events the user selects and confirms. |
| Google Sheets | Reads routines and activity from the app’s workbook; saves preferences only through a separate explicit action and logs approved event outcomes. |

The demo offers a full day, an early start and a fresh start with sparse history. The interface exposes supporting evidence, individual app status, tool activity and whether Gemini actually contributed. Successful approved actions appear in the schedule and activity view; failures stay visible.

## How the AI agent works

After explicit consent, the optional Gemini agent can call bounded read-only tools for the validated plan, calendar availability, receipt patterns and numeric/time routine preferences. It selects a focus—sleep, coffee or lunch—and cites evidence belonging to that suggestion. The app validates that selection and uses the selected card’s existing explanation to emphasize it.

The model does not invent event times, generate unrestricted advice, or execute writes. Deterministic scheduling handles dates, time zones, intervals and proposed actions. A separate approval flow lists the exact selected events and Sheets operations before the provider executes them. Without a key, or if the model’s response cannot be verified, the app visibly uses deterministic planning.

This makes the AI contribution inspectable: it prioritizes within verified choices, while external actions remain constrained and user-approved. It is not an autonomous medical or nutrition adviser.

## Reliability and evaluation

Reliability is built around what can go wrong in a real planning workflow. The source includes tests for sparse receipt history, purchase-versus-delivery timestamps, early starts, overnight scheduling, daylight-saving boundaries, all-day commitments and missing schedule openings. UI checks exercise consent, selected-action confirmation, account/demo isolation and visible live-source failures.

The live write provider rechecks Calendar availability immediately before insertion. Stable event identities prevent duplicate events on equivalent retries; activity logging checks existing event IDs, and partial logging failures remain visible for recovery. Source tests also cover pagination limits, incomplete permissions, expired tokens, conflicting changes, uncertain workbook creation and rejected model mutation requests. These mechanisms reduce specific failure modes; they are not a guarantee against every race or external service failure.

**Execution evidence belongs in [VERIFICATION.md](VERIFICATION.md).** Test existence is not proof of a passing run, a simulated transport test is not a live integration check, and software checks do not establish behavioral prediction accuracy.

## What makes it different

Dayweave focuses on the often-overlooked spaces around a busy calendar: winding down, keeping a familiar morning routine and protecting a meal break. It combines those decisions in one reviewable flow. The user can trace every suggestion to a commitment, a preference or a qualified receipt observation, then make a small, concrete change across their apps.

Its restraint is part of the design. Sparse history does not become a fabricated habit. Buying coffee does not prove drinking it. Lunch is scheduled from a preference and available time, not inferred nutritional need. The app neither measures sleep needs nor promises better sleep or future energy levels.

## Technical summary

React, TypeScript and Vite provide the static browser interface. Luxon handles time-zone-aware scheduling. Google Identity Services supplies browser OAuth; Gmail, Calendar and Sheets use direct REST requests. Gemini’s bounded tool loop reviews minimized structured observations. Google access tokens and Gemini keys remain in memory; model tool payloads exclude raw email bodies, account IDs and sensitive free text. Account-scoped workbook references and recovery metadata support reconnection and retry behavior.

Setup instructions: [Google setup](GOOGLE-SETUP.md). Demonstration: [108-second script](DEMO.md).

## Evidence and link handoff — fill before submission

Use a dedicated authorized synthetic account for shareable live proof. Record sanitized outcomes, not tokens, personal data or account identifiers. Root owns verification and publishing.

| Required material or claim | Current handoff state / evidence slot |
| --- | --- |
| Team members and every member’s email | `[User-provided names and emails; do not infer]` |
| Accessible GitHub repository | `[Published repository URL; verify anonymous access]` |
| Hosted working app, if provided | `[Published app URL; verify demo loads]` |
| Accessible demo video | `[Final video URL; verify anonymous playback and measured duration]` |
| Submitted revision | `[Exact commit SHA]` |
| Automated checks | `[Commands, timestamp, passed/failed counts, evidence reference for this revision]` |
| Production build | `[Command, timestamp, outcome and evidence reference]` |
| Live Gmail read | `Pending root verification: [successful bounded read and sanitized trace reference]` |
| Live Calendar read and approved write | `Pending root verification: [read, selected action, conflict recheck and event outcome reference]` |
| Live Sheets preferences and action round trip | `Pending root verification: [explicit save/read and approved action row reference]` |
| Actual Gemini tool loop | `Pending root verification: [successful read-tool trace, validated focus and aiUsed=true reference]` |
| Retry/idempotence proof | `[Test or live proof, labeled accurately; equivalent event and log counts before/after]` |
| Submission receipt | `[Submitted time and confirmation; only after actual submission]` |

If checks remain pending when submitting, use this status sentence: **“The accessible demo uses synthetic data; live Google integration checks and successful Gemini execution are documented only where completed in the verification record.”** Replace it with a more specific verified statement if appropriate. Do not claim the three-app requirement is demonstrated solely by the synthetic provider.

The official judging weights are technical execution 30%, reliability/evaluation 25%, usefulness 20%, originality 15%, and demo clarity 10%. Keep the repository’s setup and evidence easy to find, and let the short video show one complete, accurately labeled workflow. [Official judging and README requirements](https://multiappagenthackathon.com/)
