# Verification record

Executed on September 13, 2026. This record distinguishes real provider calls from synthetic tests. Publication and video checks are added after they complete.

## Completed checks

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

## Remaining release evidence


- Public repository, CI and hosted URL.
- Two-minute demo artifact and playback.

## Evaluation boundaries

Synthetic fixtures validate expected software behavior and error handling. They do not establish personal prediction accuracy. Live API checks establish integration behavior only for the tested account, scopes, inputs, and revision. Gemini was tested with synthetic data, separately from the owner's live Google data.

Calendar conflict checks cover the owned primary calendar. An external edit between the final availability check and insertion cannot be atomically excluded. Sheets appends are serialized in the same browser; simultaneous approvals on separate devices do not have a server-side transaction lock. Google OAuth remains in testing mode: other accounts require the owner's test-user authorization or their own configured client.
