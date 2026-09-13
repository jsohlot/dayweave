# Optional food routine ideas

Choose **Your routines → Food goal → Include more protein → Use for this plan**. The goal defaults to absent/no goal and is never inferred from purchases, meetings, or body measurements. Saving it to Google Sheets is a separate explicit action. Existing 12-row workbooks remain readable; saves now cover 13 rows, and removing the optional field clears its old row.

The plan can show Starbucks and Chipotle menu ideas beside existing coffee/lunch times, plus a Costco grocery reminder. Only recent receipt observations with recognized sender mailbox domains establish a familiar merchant; display names and body mentions do not. This domain match is not an authenticity guarantee. Up to 30 relevant receipt emails from the past 30 days are considered; malformed, future, stale, and duplicate observations are excluded. Email arrival can establish that a receipt was received, never when food was purchased or consumed.

The live Gmail query includes Costco and Chipotle. Item extraction still returns an empty list: no food quantity, nutrient intake, pantry stock, protein deficiency, or calorie/carbohydrate requirement is inferred. The full-day demo adds clearly synthetic branded receipts, while the fresh-start fixture remains empty. Branded fixtures do not represent a live integration with those restaurants.

With any saved food-preference text, specific menu suggestions are withheld and the user is directed to review ingredients. The app does not assess allergy safety. Without restriction text, the optional Starbucks idea explicitly states that the Vanilla Protein Latte contains milk and that recipes/availability vary. Menu links are hard-coded official URLs; receipt bodies and URLs never become menu links.

Official reference pages checked September 13, 2026:

- [Starbucks protein drinks](https://www.starbucks.com/discover/protein-drinks/)
- [Starbucks Vanilla Protein Latte](https://www.starbucks.com/menu/product/28499/hot)
- [Chipotle high-protein meals](https://www.chipotle.com/high-protein-meals)

No additional external-app connector, food order, or extra Calendar action is introduced. The existing lunch reservation and explicit approval workflow remain unchanged. Merchant names, items, receipt URLs, dietary text, and these food ideas stay out of all Gemini tool responses.

The **Monthly estimate** panel is a separate, manual calculator. It accepts an explicitly assumed fraction of purchases, an inventory balance (opening stock + purchases − closing stock − waste/given away), or a user-reported consumed amount. Every calculation requires a household size, period of 1–31 days, matching food/label weight bases, label carbohydrate value, and explicit equal sharing. An optional user-entered daily target compares this food's contribution only. No recommended intake or dietary excess is inferred.

For example, a fictional 10 kg of dry rice reported eaten by two people in 30 days, using a hypothetical label of 80 g carbohydrate per 100 g, gives 8,000 g carbohydrate for the household over the period and 133.3 g per person per day from rice alone. Changing the amount invalidates the prior result. Fictional provenance remains visible after edits. Inputs stay in page memory, never enter Gemini or Sheets, and clear when a new plan is generated. Receipt item quantities are not automatically extracted.

Validation: 128 tests across 10 files pass, including opting in through the app, no automatic save/write, empty history, spoofed sender display names, future/stale/malformed receipts, duplicate observations, free-text restrictions, Sheets goal round-trip/removal, minimized Gemini payloads, household arithmetic, invalid inventory and labels, fictional provenance, and plan-change resets. Production build passes. Independent code review found no remaining actionable issues. Browser checks confirmed the rice example and responsive form; continuous recording is a separate release artifact.
