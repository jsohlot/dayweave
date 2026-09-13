# Connect a real Google account

Dayweave is a browser app using Google's supported token model. It needs a public OAuth client ID, not a client secret. Tokens are short-lived, kept in memory, and obtained again after refresh. A test-user configuration is sufficient for a controlled demo; this is not public OAuth verification.

1. Sign in to https://console.cloud.google.com/ using an account with 2-Step Verification enabled. Create a project named **Dayweave Hackathon**.
2. Enable **Gmail API**, **Google Calendar API**, **Google Sheets API**, and **Google Drive API** in that project.
3. Open Google Auth Platform. Set app name **Dayweave**, your support/developer contact email, audience **External**, publishing status **Testing**. Add the exact account used in the demo as a test user. Review and accept Google's terms yourself if requested.
4. Add scopes: `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/calendar.events.owned`, and `https://www.googleapis.com/auth/drive.file`.
5. Create OAuth client: **Web application**. Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:4173`, and `https://jsohlot.github.io`. Use origins only, without `/dayweave/`. The popup token flow does not require a redirect URI or client secret in the app.
6. Copy the **client ID** into Dayweave's connection settings. Do not copy the client secret.
7. Connect Google in Dayweave. The account must be a configured test user. Review the requested permissions, then approve personally. Google may show an unverified testing-app notice; public distribution requires separate verification.
8. Save preferences explicitly to create Dayweave's spreadsheet. Generate a plan, inspect the evidence, select proposed Calendar actions, and approve them. Verify the real Calendar and Sheet links.

## Gemini
Create a Gemini API key in https://aistudio.google.com/apikey and enter it into Dayweave's AI settings. Never paste it into chat, Git, README, a browser URL, or a `VITE_*` environment variable. It stays in page memory. Enable AI processing only after reviewing what structured context will be sent. API quota and billing are controlled in your Google account; this build does not authorize a paid subscription.

## Troubleshooting
- **Google Cloud access blocked:** enable account 2-Step Verification yourself, then reload Cloud Console.
- **origin_mismatch:** ensure the exact protocol/host/port are in Authorized JavaScript origins. Production origin is `https://jsohlot.github.io`.
- **access_denied:** verify the signed-in email is a test user and required scopes were granted.
- **API disabled / 403:** enable the named API in the same Cloud project that owns the client ID. Organization policies may restrict third-party apps.
- **Session expired:** reconnect with the Google button; the app does not store refresh tokens.
- **Gemini quota / unavailable:** the app labels its deterministic planning fallback; it does not claim an AI call succeeded.
- **No receipts found:** inference remains limited. Use preferences or a clearly labeled synthetic demo; do not invent purchase history.

## Demonstrating safely
Use a dedicated account with fictional receipts and events. Fixture messages should have explicit purchase dates/times; received email time alone is not purchase or consumption time. Never put a real inbox, personal calendar, tokens, or private spreadsheet content in the public video or repository.
