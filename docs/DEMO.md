# Dayweave demo script

Target runtime: **108 seconds**, leaving a 12-second margin under the event’s two-minute limit. Rehearse and check the actual export duration; the timeline is a recording plan, not proof of a finished video. The [official hackathon brief](https://multiappagenthackathon.com/) asks for a useful agent across at least three external apps, evidence that it works, and a video accessible to judges.

## Before recording

Use the built-in **Demo workspace** with **A full day** and default routines for the continuous walkthrough below. It contains synthetic data and performs simulated Calendar/Sheets actions in memory. Keep its mode badge visible. The full-day fixture has meetings across the preferred 12:30 lunch time; the proposed half-hour lunch begins at 1:15 PM. Sleep timing works backward from the chosen sleep target and morning buffers; coffee uses timestamped purchases across distinct days. Do not describe lunch as learned from receipt history.

If root has verified a successful Gemini run, configure it and give consent before capture; never record a key field or authorization popup. The UI must say **Gemini AI used** before using the AI-success narration. A key’s presence, a mock test, or a loading trace is insufficient. A real Gemini call over synthetic data still does not establish live Gmail, Calendar or Sheets use.

Keep the same plan and provider through the repeat-action sequence. Switching scenarios resets the demo session, so show sparse history last. Nothing here authorizes creating synthetic data in a live account.

## Narration and screen sequence

Read only the narration column. Use the alternate AI line below when needed.

| Time | Screen action | Narration |
| --- | --- | --- |
| 0–12s | Show the working dashboard and all three cards. | Tomorrow’s meetings are already on your calendar. But rest, coffee and lunch still need room. Dayweave helps you prepare before the day begins. |
| 12–23s | Point to **Demo workspace** and the three app connections. | This walkthrough uses synthetic data. The connected workflow brings together Gmail receipts, Google Calendar commitments, and routines and action history in Google Sheets. |
| 23–36s | Expand coffee’s **Why this fits**. Keep receipt evidence readable. | Coffee suggestions use timestamped purchase history when there’s enough evidence. Purchase time isn’t consumption time, and an email’s delivery time never stands in for a purchase. |
| 36–48s | Expand sleep evidence, then lunch evidence beside the schedule. | Sleep timing works backward from your target and morning commitments. Here, meetings overlap the preferred lunch time, so Dayweave finds a complete opening at one-fifteen. |
| 48–61s | Show **Gemini AI used** and expand **View agent activity**; otherwise use the alternate line. | Gemini calls read-only tools to choose which suggestion deserves attention. The scheduling rules still own the times. The activity trace makes that division visible. |
| 61–80s | Select only lunch. Open **Review & add**, pause on exact start/end and Sheets notice, then confirm. | I choose lunch and review the exact event and activity-log write before confirming. In this demo, both changes are simulated. The selected break now appears in the schedule. |
| 80–95s | Select the same lunch action again, review and confirm without refreshing. Show the already-reserved result; open **Activity** to show one row. | Repeating the same approval doesn’t create another event or log row. The live provider also rechecks availability before writing and reports conflicts or incomplete logging. |
| 95–108s | Close Activity, switch to **A fresh start**, expand coffee evidence. End on the dashboard. | With sparse history, Dayweave uses a preference instead of inventing a pattern. Three apps, evidence you can inspect, and small changes you control. |

**Alternate 48–61s narration when Gemini has not succeeded:** “This run is labeled deterministic: Gemini wasn’t used. The optional agent can select a focus through read-only tools, while scheduling rules and approval control the changes.” Show the actual deterministic badge and trace. Do not conceal the status by using an unrelated successful screenshot.

## Optional live proof insert

Only after root records successful requests in [VERIFICATION.md](VERIFICATION.md), replace part of the walkthrough with a clearly labeled cut using an authorized, synthetic-only test account. Fit it into the existing 108 seconds; do not append an extra segment.

- Show the **Live Google account** badge and the source-read trace, then the approved Calendar event and corresponding Sheets activity row. A sidebar connection badge alone is not evidence of three successful integrations.
- Replace the mode narration with: “These screens use live Google APIs with synthetic test data. Gmail supplies receipt observations, Calendar supplies commitments, and Sheets supplies routines and records approved actions.”
- Replace the simulated-write sentence with: “This approved event is now in Google Calendar, with its action recorded in Google Sheets.” Use it only after both outcomes are verified.
- If no qualifying live clip exists, keep the demo wording and state that live integration checks remain pending in the submission. Do not relabel simulated actions as API writes.

## Published video

[Watch the finished demo](https://jsohlot.github.io/dayweave/demo.html) · [Download MP4](https://jsohlot.github.io/dayweave/demo.mp4)

The final export is **106.02 seconds**, 1920×1080 H.264/AAC, with captions and synthetic narration. It uses ten edited captures of the working app, including enlarged original evidence and approval panels. The actual edit follows the captured states rather than this preliminary timing outline.

The fictional walkthrough includes a successful real Gemini run. The final scene is a separately labeled live Google account result. Live Gmail/Calendar reads, Sheets preference saving, an approved Calendar lunch event and activity row, and a duplicate-free retry were verified independently of the fictional walkthrough. No inbox contents, keys, or private calendar titles appear in the video. See [verification](VERIFICATION.md) for scope and limitations.
