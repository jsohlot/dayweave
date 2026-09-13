# Dayweave

**A little more ready for tomorrow.**

Dayweave connects Gmail, Google Calendar, and Google Sheets to help you prepare for tomorrow. It looks for evidence of coffee purchase timing, combines your preferred lunch window with upcoming commitments, and proposes practical sleep and meal preparation. You choose the changes before the agent creates Calendar events and records the outcome in Sheets.

Built for the [Multi-App AI Agent Hackathon](https://multiappagenthackathon.com/), September 13, 2026.

## Try it

[Open Dayweave](https://jsohlot.github.io/dayweave/) · [Verification record](docs/VERIFICATION.md)

The hosted app includes a clearly labeled synthetic demo. Connected mode requires a Google OAuth test client and your own authorized Google account. Gemini-assisted planning requires your own Gemini API key, entered in the app for the current page session only.

A working demo does not prove successful live integrations or predictive accuracy. See [verification evidence](docs/VERIFICATION.md) for the exact checks completed on the submitted revision.

## One complete workflow

1. Set tomorrow's date and your sleep target, morning preparation time, and preferred coffee/lunch windows.
2. Read relevant Gmail receipts and tomorrow's Calendar commitments. Read saved preferences from the app-created Sheet when available.
3. Generate a grounded plan. The deterministic planner owns dates, times, conflicts, and action validation. A bounded Gemini agent calls read-only planning tools and selects a focus using verified evidence; displayed explanations come from the validated plan.
4. Inspect the supporting sources and tool activity. Missing history remains missing; an email timestamp is not treated as proof of consumption.
5. Select proposed actions and review the exact Calendar events before approval.
6. Create approved events and log outcomes to Sheets. Reruns use stable event identities and recheck Calendar availability; partial failures remain visible.

## External apps

| App | Reads | Approved writes |
| --- | --- | --- |
| Gmail | Recent relevant receipt messages | None |
| Google Calendar | Upcoming events on the owned primary calendar | Selected sleep, coffee, meal, or preparation blocks |
| Google Sheets | Preferences and action history from the app-created workbook | Explicitly saved preferences and approved action outcomes |

Google OAuth uses the browser token model. Access tokens stay in memory; there is no client secret or refresh token in the app. A narrow `drive.file` permission limits Sheets access to files created or opened with this app. The connection flow identifies the Google account so workbook references are not reused across accounts.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Start with **Demo** for synthetic scenarios. Connect Google only after [completing Google setup](docs/GOOGLE-SETUP.md).

```sh
npm test
npm run build
npm run preview
```

The app is a static Vite build. GitHub Actions verifies the project and deploys `dist/` to GitHub Pages. Its Google OAuth authorized JavaScript origin is the domain, not the repository path.

## AI and reliability

The default model is [`gemini-3.6-flash`](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash), using the supported minimal thinking level. Set `VITE_GEMINI_MODEL` to override the public model name; overrides use that model's default thinking settings. The bounded `generateContent` loop remains limited to three requests and six read-only tool calls.

The agent's model receives minimized structured planning context, not arbitrary authority to modify accounts. Model tools are read-only. Calendar and Sheets mutations are separate, deterministic operations behind explicit user approval. The interface labels whether an actual AI request succeeded or a deterministic plan was used.

Core checks cover schedule calculations, evidence limits, sparse history, time zones, action approval, retry/duplicate behavior, changed conflicts, API failures, and prompt-injection boundaries. Exact executed results belong in [VERIFICATION.md](docs/VERIFICATION.md), rather than claims inferred from the existence of tests.

This prototype has no prospective clinical or behavioral prediction study. Its demo validates software behavior, not claims about an individual's diet, sleep quality, metabolism, or future energy levels.

## Data and limits

- Demo data is fictional and labeled.
- Real receipts establish purchases, not who ate or drank an item.
- Meeting density does not establish a need for additional carbohydrates.
- Sleep suggestions work backward from user-selected targets and commitments; they do not guarantee sleep or measure individual sleep needs.
- No payments, food orders, emails, or medical treatment actions are executed.
- Google tokens and Gemini keys never belong in Git, browser URLs, screenshots, video, or `VITE_*` build variables.
- Review [privacy](public/privacy.html) and [Google setup](docs/GOOGLE-SETUP.md).

## Submission materials

- [Two-minute demonstration outline](docs/DEMO.md)
- [Verification record](docs/VERIFICATION.md)
- [Build contract](docs/BUILD-CONTRACT.md)
- [License](LICENSE)
