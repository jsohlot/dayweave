# Verification record

Executed on September 13, 2026. This record distinguishes real provider calls from synthetic tests. The linked CI run and public demo make the execution evidence inspectable.

## Current implementation and continuous recording

- Release implementation `759e8b3`: all **128 tests across 10 files** and the production build passed after fixing late-wake lunch scheduling, same-account reconnection, and interrupted-workbook recovery. Independent read-only review found no remaining actionable issues in those fixes.
- Reconnection preserves the exact pending plan for the same verified account, clears data on account changes, and requires renewed approval. Workbook recovery searches before adopting or explicitly authorizing replacement; recovery itself creates no workbook.
- The new **84.09-second continuous screen recording** replaces the edited screenshot demo. All 513 captured frames use their original timestamps, with no video cuts or speed changes. One continuous synthetic narration track and 23 captions accompany the actual app interactions. Full-file decode passed.
- Recording: source explanations, a successful Gemini run over synthetic data, chosen food goal, familiar merchant ideas, conditional monthly rice estimates, exact-action approval, and a retry retaining one activity row. It contains no private Google data. The video was captured from clean build `6de8f84`; the later recovery and late-wake fixes do not change its normal-day flow.
- MP4 SHA-256: `8247063ab126d77e9d3bd94db772803a8642fbad1567ca749b6ddb03d55876bc`.
- A separate fresh judge-style checkout of the feature candidate passed installation, 114 tests, build, full dependency audit, 21 local links, 11 built resources, and 18 public URL checks. Final release/deployment checks are recorded separately below once completed.

## Earlier submitted release checks

- **Automated validation:** 69 tests across 6 files passed; production TypeScript/Vite build passed. The suite covers planner timing, sparse history, DST, conflicts, approval boundaries, Google request handling, retries, account isolation, UI transitions, and bounded Gemini tool calls.
- **Dependency audit:** production dependency audit reported zero vulnerabilities.
- **Independent review:** separate read-only reviewer reproduced workbook recovery after a lost creation response, preference boundaries, and account/demo isolation after fixes. No remaining blockers reported in that review's scope.
- **Browser demo:** generated a synthetic day, reviewed and approved lunch, verified the added schedule entry and activity row, then repeated approval without duplicate event/log creation.
- **Real Gemini:** three successful HTTP 200 requests to `gemini-3.6-flash:generateContent` using synthetic inputs. The UI reported `Gemini AI used`; the loop read the validated plan and selected a grounded focus. A retired model's real HTTP 404 was corrected, with a regression test. No API key is stored in source or build output.
- **Live Google authorization:** dedicated web OAuth client, owner test account, Gmail readonly, owned Calendar events, and app-specific Drive file scope. Gmail, Calendar, Sheets, and Drive APIs enabled.
- **Live Gmail read:** message search and matching message reads returned HTTP 200. Missing explicit purchase times were correctly labeled as insufficient evidence; receipt details are excluded from public artifacts.
- **Live Calendar read:** primary calendar event queries returned HTTP 200. The tested day had no commitments; empty results were displayed without invented meetings.
- **Live approved action:** created a lunch block in the primary Calendar and appended its Sheets activity row. Repeated approval returned `Already present in your primary calendar`; refreshed activity still contained exactly one row.
- **Live Sheets save:** app-created workbook and preference write returned HTTP 200; UI confirmed preferences saved.
- **Credential-pattern scan:** no actual API keys, OAuth secrets, access tokens, or private keys found in publishable project files.

## Earlier publication and video

- **Public repository and site:** [source](https://github.com/jsohlot/dayweave) and [hosted app](https://jsohlot.github.io/dayweave/) opened successfully. [CI verification and deployment](https://github.com/jsohlot/dayweave/actions/runs/34778472927) both passed.
- **Hosted Google connection:** public-site OAuth succeeded and the app read the owner’s Gmail and primary Calendar. The privacy-policy link was visible in consent.
- **Responsive browser checks:** desktop 1440px and mobile 390px inspected; the 390px layout had no horizontal overflow.
- **Video revision:** 101.08 seconds, 1920×1080, H.264/AAC, with one continuous synthetic narration track and 29 aligned captions. Full export decode and local browser playback passed. The ten app captures remain mode-labeled; an eleventh card clearly identifies wearable integration as planned and not connected. The previous 106.02-second publication was also verified, and is superseded by this revision.
- **Submission:** the organizer Google Form accepted the solo-project entry at approximately 12:24 PM Pacific on September 13, 2026 and displayed “Your response has been recorded.” The submitted repository revision was `ff53f4354e73578c20e64d66641c3d88302b9990`; later documentation updates do not alter the demonstrated app.

## Earlier clean release verification

The revised video release was checked from a separate fresh checkout on September 13, 2026. The checkout started without `node_modules`, `dist`, `.env.local`, or saved account settings, used a new npm cache, and installed the committed lockfile under Node.js 22.22.3. Only the public Google client ID was supplied to the build.

- `npm ci`: passed; zero reported vulnerabilities.
- `npm test`: all 69 tests across 6 files passed.
- `npm run build`: TypeScript and production Vite build passed.
- `npm audit --omit=dev`: zero vulnerabilities.
- The production build was served on a new local origin and opened in Chrome. The full-day workflow required review before approval, created one simulated lunch event and activity row, and retained exactly one row after repeated approval.
- Fresh-start and early-start scenarios worked; sparse history stayed labeled and the early commitment moved the planned wake-up to 5:30 AM.
- A real Gemini run on synthetic early-start data succeeded and the UI displayed `Gemini AI used`. Google account data was not used for this AI check.
- The 390px viewport had no horizontal overflow; browser console checks found no errors or warnings during the scenario checks.
- Tracked source and production text assets passed a credential-pattern scan. The published MP4 matches the reviewed revision, SHA-256 `76a0b202f81eed96310b36a32cf216bcc43e71a2651eb867578ccb2d15021fec`.

### Post-deployment checks

- [Video-release CI and Pages deployment](https://github.com/jsohlot/dayweave/actions/runs/34778472927) passed for `42c054ff173dc9126fce67904b5b35a81748d5bb` on a fresh Ubuntu runner.
- Anonymous requests returned HTTP 200 for the app, demo player, MP4, captions, privacy page, and setup guide. The hosted MP4 hash matches the reviewed 101.08-second revision above. Published JavaScript and CSS are byte-for-byte identical to the tested clean production build.
- Reconnected the authorized test account on the public site; live Gmail and Calendar data loaded successfully. Retried the existing September 14 lunch action: the provider returned `Already present in your primary calendar` and saved its Sheets activity row. Repeating approval again left exactly one activity row; no additional Calendar event was created.
- The hosted player loaded the revised 101.08-second video without a media error. Browser playback was checked after deployment.

The fresh checkout verifies installation and the demo/AI workflow. Live Google authorization and write/retry checks are the separate executed checks above; app source code is unchanged by the video release. GitHub Actions also installs, tests, builds, and deploys on a fresh Ubuntu runner for each main-branch publication.

## Evaluation boundaries

### Food-feature candidate verification

On September 13, 2026, revision `6de8f84` was cloned into a separate directory with no dependencies, build output, or environment file. A new npm cache and Node.js 22.22.3 were used. Installation, all 114 tests across 10 files, and the production build passed; the production dependency audit reported zero vulnerabilities. Tracked source and built assets passed both credential-pattern checks and an exact check against the temporary Gemini credential used for synthetic testing.

Independent review found no remaining actionable issues in the meal-idea and monthly-calculator changes. Browser checks exercised opt-in merchant ideas, the fictional rice calculation, changed quantities, approved simulated lunch creation, and a repeat approval returning an existing reservation. A real Gemini request succeeded with synthetic inputs. No new live Google writes were performed for this revision. That candidate check preceded the completed 84-second continuous recording and final recovery fixes described above.

Synthetic fixtures validate expected software behavior and error handling. They do not establish personal prediction accuracy. Live API checks establish integration behavior only for the tested account, scopes, inputs, and revision. Gemini was tested with synthetic data, separately from the owner's live Google data.

Calendar conflict checks cover the owned primary calendar. An external edit between the final availability check and insertion cannot be atomically excluded. Sheets appends are serialized in the same browser; simultaneous approvals on separate devices do not have a server-side transaction lock. Google OAuth remains in testing mode: other accounts require the owner's test-user authorization or their own configured client.
