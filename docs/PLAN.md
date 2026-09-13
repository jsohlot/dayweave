# Dayweave implementation plan

Goal: deliver a three-app, evidence-backed day-ahead AI agent and accessible hackathon repository/demo.
Architecture and exact interfaces: BUILD-CONTRACT.md and src/types.ts. User approved design and delegated execution.

- [ ] UI: produce responsive working dashboard, editable preferences, live/demo switch, source evidence, explicit approval, error/retry and action history.
- [ ] Engine: write failing planner behavior tests, implement timezone-aware sleep/coffee/lunch calculations and bounded Gemini read-tool loop; add labeled deterministic demo provider and scenarios.
- [ ] Google: test transport/action failures first; implement OAuth, Gmail, Calendar and Sheets provider including scope handling, deterministic event IDs, recheck and partial-write recovery.
- [ ] Integrate: run npm test and npm run build, fix contract seams, verify browser core workflows including settings, replan and repeat action.
- [ ] Live proof: user completes Google security/authorization and enters Gemini key in app; inspect read-only evidence and perform synthetic labeled approved demo actions.
- [ ] Independent review: separate fresh session checks action permissions, credential handling, no fake fallback, timezone math, behavior regressions.
- [ ] Publish: sanitize source, create GitHub repo and Pages deployment, verify public output; record <2-minute demo and link from README; prepare concrete submission information from website/calendar requirements.
