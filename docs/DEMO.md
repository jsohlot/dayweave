# Dayweave demo

[Watch the continuous product recording](https://jsohlot.github.io/dayweave/demo.html) · [MP4](https://jsohlot.github.io/dayweave/demo.mp4) · [English captions](https://jsohlot.github.io/dayweave/demo.vtt)

**Runtime: 84.09 seconds**, within the two-minute limit. This replaces the previous edited screenshot demonstration.

## What the video demonstrates

A continuous recording of the actual browser app: source explanations, a successful real Gemini run on synthetic observations, an explicit protein goal with familiar merchant ideas, the monthly rice calculator, changed inputs and recalculation, exact-action approval, and a retry retaining one activity record. The sample data and simulated Google Calendar/Sheets changes are visibly labeled.

The recording was captured from a separate clean production build of `6de8f84`. Subsequent release fixes add late-wake scheduling protection and Google recovery controls; the recorded normal-day workflow is unchanged. The final release is checked separately with the full suite and browser verification. Live Google reads and approved writes were tested separately and are not presented as part of this synthetic recording; see [verification](VERIFICATION.md).

## Screen sequence

| Approximate time | Working product interaction |
| --- | --- |
| 0–11s | Sleep and coffee evidence |
| 11–20s | Successful Gemini tool trace |
| 20–48s | Chosen food goal and familiar merchant suggestions |
| 48–60s | Fictional 10 kg rice estimate, then 5 kg recalculation |
| 60–75s | Select lunch, review exact event and activity log, confirm |
| 75–84s | Repeat approval, existing reservation, one activity record |

## Recording boundaries

- Captured the browser compositor's continuous frame stream, including scrolling, clicks, dialogs, and results. All 513 captured frames retain their original timestamps; there are no scene cuts, selected screenshot panels, or video speed changes.
- Static moments remain at their real duration. Letterboxing and captions are the only visual additions.
- One continuous synthetic narration take uses Sulafat with Gemini 2.5 Flash TTS Preview. Audio playback is slowed uniformly by 2% for a relaxed delivery; the video timing is unchanged.
- No private inbox contents, credentials, or private calendar titles appear in the recording.
- Receipt observations do not establish food consumption or dietary deficiency. The monthly example is explicitly fictional and depends on entered quantities, labels, and sharing assumptions.
- Wearable integration is planned, not connected; provider setup and user authorization are still required.

## Narration

Tomorrow is packed. Dayweave connects Gmail, Google Calendar, and Google Sheets to make room for coffee, lunch, and rest. This walkthrough uses clearly labeled sample data.

Gemini reviews minimized signals through read-only tools. Scheduling rules validate the times, and this activity trace shows the calls. Each suggestion explains its evidence.

Food ideas start with a goal you choose: include more protein. Recent receipt patterns suggest familiar options at Starbucks and Chipotle, plus a reminder for your next Costco trip. These are menu ideas, not food orders. Ingredients and availability still need checking. Receipts don't prove what someone ate, or whether they're protein deficient. That distinction keeps suggestions useful without pretending to know your entire diet.

The monthly calculator makes assumptions explicit. Ten kilograms of dry rice, shared by two people over thirty days, gives this conditional estimate. Change the amount eaten to five kilograms, and the result halves.

Now protect the lunch break. Select it, review the exact calendar event and Sheets activity entry, then confirm. The sample event appears in the schedule. Repeat the approval, and the existing reservation is recognized without creating a duplicate. The activity log keeps one record. Real Google integrations were tested separately; wearable data remains a future connection.

## Export details

- 1920×1080, 30 fps delivery, H.264/AAC, fast-start MP4.
- English captions burned into the footer and supplied as a separate WebVTT track.
- Full-file decode passed; final browser playback and public link checks are recorded in the verification brief.
- MP4 SHA-256: `8247063ab126d77e9d3bd94db772803a8642fbad1567ca749b6ddb03d55876bc`.
