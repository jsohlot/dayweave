# Dayweave demo

[Watch the demo](https://jsohlot.github.io/dayweave/demo.html) · [Download MP4](https://jsohlot.github.io/dayweave/demo.mp4)

**Runtime: 101.08 seconds**, within the hackathon’s two-minute limit. The 1920×1080 H.264/AAC export uses one continuous synthetic narration track, synchronized captions, ten actual app captures, and a clearly labeled wearable roadmap card.

## What the video demonstrates

The fictional walkthrough includes a successful real Gemini run over synthetic observations. Walkthrough Calendar and Sheets actions are simulated and labeled. A separate live-account scene represents independently verified Gmail and Calendar reads, Sheets preference saving, an approved Calendar lunch event with its activity row, and a duplicate-free retry. See [verification](VERIFICATION.md) for the tested scope.

Wearable integration is a planned extension. Provider setup and user authorization are still required; no wearable is connected today. This is not a claim that an attempted integration was blocked.

## Narration and screen sequence

| Time | Screen | Narration |
| --- | --- | --- |
| 0.00–14.46s | Tomorrow, with room for you. | Tomorrow is packed with meetings. Where do coffee, lunch, and a good night's sleep fit? Dayweave connects Gmail, Google Calendar, and Google Sheets to help you make room. Here's a walkthrough with sample data. |
| 14.46–24.48s | A familiar morning, grounded in evidence. | It starts with your usual coffee time, using timestamped purchases when there's enough history. That's a useful clue, though a receipt can't tell us what you actually drank. |
| 24.48–33.40s | Prepare tonight for tomorrow. | Then it works backward from your first commitment, your morning routine, and your chosen sleep target, so you can plan tonight with tomorrow in mind. |
| 33.40–40.30s | Find a real opening for lunch. | When meetings crowd out lunch, it finds a full break that really fits, and explains why that time works. |
| 40.30–51.08s | AI prioritizes. Validated rules schedule. | Gemini brings these signals together, using read-only tools to choose a focus. Scheduling rules check the times, and you can follow the agent's reasoning in its activity trace. |
| 51.08–58.60s | Review every change before it happens. | You're still in control. Choose a suggestion, review the exact calendar event and Sheets update, then confirm. |
| 58.60–65.00s | One approval. A visible result. | The event appears in your schedule. These sample changes are simulated, and the app labels them clearly. |
| 65.00–70.74s | Keep a record. Avoid duplicates. | Every action gets a record. Repeat the same approval, and it avoids creating duplicates. |
| 70.74–75.52s | Missing history stays missing. | And when history is thin, it says so, using your preferences instead of guessing at a habit. |
| 75.52–88.72s | Separate, verified live integration proof. | We also tested a real Google account: reading Gmail and Calendar, saving preferences in Sheets, and creating an approved lunch event with its activity log. Repeating that action created no duplicate. |
| 88.72–101.08s | Wearable roadmap — planned, not connected | Next, we'd connect a wearable, with the user's authorization, to bring in sleep and activity data. That's planned, not connected today. Dayweave makes tomorrow easier to act on, one choice at a time. |

## Recording boundaries

- Screens are edited captures of the working app, not an uninterrupted screen recording. Enlarged panels use the original screenshot pixels.
- The synthetic walkthrough and live Google verification are visibly distinguished.
- No inbox contents, keys, or private calendar titles appear in the video.
- The synthetic voice is disclosed. No speed adjustment or inserted gaps were used.
- A receipt proves a purchase, not consumption. The planner does not establish clinical or nutritional prediction accuracy.

## Export details

- Duration: 101.08 seconds.
- Resolution: 1920×1080 at 30 fps; H.264 video and AAC audio.
- English captions: embedded in the picture and available as a [WebVTT track](https://jsohlot.github.io/dayweave/demo.vtt).
- Voice: Sulafat, generated with Gemini 3.1 Flash TTS Preview.
- Full-file decode and browser playback verified before publication.
- MP4 SHA-256: `76a0b202f81eed96310b36a32cf216bcc43e71a2651eb867578ccb2d15021fec`.
