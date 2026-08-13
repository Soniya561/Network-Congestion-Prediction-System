# Reports Page Final Polish Brief

## Objective
Polish only the real application Reports page for the NETSENSE AI frontend. The page already has the desired dark futuristic identity, typography, header/navigation feel, summary metrics, report area, and timeline. Keep that identity and avoid a whole-page redesign.

## Scope
- Edit only `frontend/src/pages/ReportsPage.tsx` unless a build-only type issue absolutely requires a same-page local adjustment.
- Do not modify `frontend/src/pages/DashboardPage.tsx`.
- Do not modify backend APIs, backend logic, prediction logic, routing, or other pages.
- Do not fabricate missing data.

## Target File
`C:\Users\bhara\Downloads\Network-Congestion-Prediction-System\frontend\src\pages\ReportsPage.tsx`

## Existing App Context
- React + Vite + Tailwind CSS v4.
- Existing page uses Recharts and local API helper `frontend/src/api/api.ts`.
- Preserve the current NETSENSE AI dark/cyan/slate visual language and compact analytical report mood.

## Required Layout Change
Replace the current separated Congestion Distribution and Model Performance layout with one compact horizontal analytical section:
- Left 30%: compact donut chart, vertically centered.
- Middle 30%: concise congestion summary and compact distribution indicator.
- Right 40%: model performance with clear F1 score visualization.

The three zones should visually belong to one analytical section. Do not create three large unrelated cards. Avoid large empty areas.

## Left: Donut
- Move donut chart to the left side of the section.
- Use actual event counts from existing `distribution` / incident data.
- Show LOW, MEDIUM, HIGH.
- Center text inside donut:
  - `DOMINANT`
  - actual dominant severity label
  - actual classified event count, e.g. `20 EVENTS`
- Do not hard-code severity or count values.
- Add compact legend below or beside donut:
  - LOW X EVENTS
  - MEDIUM X EVENTS
  - HIGH X EVENTS

## Middle: Congestion Summary
Show compact analytical summary using actual computed data:
- DOMINANT CONGESTION: actual dominant severity
- TOTAL CLASSIFIED: actual known classified count
- HIGHEST SEVERITY: actual highest severity
- RISK PROFILE: derived from real severity composition, with no fabricated telemetry. Suggested mapping:
  - High dominant or any strong high proportion: Elevated
  - Medium dominant: Moderate
  - Low dominant: Low
  - No data: Unavailable
- Include a small horizontal distribution indicator for LOW, MEDIUM, HIGH using actual counts. Bars may be CSS width bars rather than text block glyphs.
- Keep compact. Do not make a huge card.

## Right: Model Performance
Move model performance into the right side of the same analytical section.
- Heading: MODEL PERFORMANCE
- Model name: use `analytics?.model_name || "RandomForest_Model"` as existing page does.
- Show rows for:
  - ACCURACY
  - PRECISION
  - RECALL
  - F1 SCORE
- Use actual `analytics` API values and `normalizeScore` / `formatPercent`.
- Do not hard-code `98.98%`.
- Use clean horizontal bars, labels, and percent values.
- Make F1 Score especially clear.
- Include small metadata: MODEL and STATUS ACTIVE/UNAVAILABLE.

## Download Report Section
Keep `DOWNLOADABLE ANALYSIS PACKAGE` immediately below the analytical section.
Keep existing report summary fields:
- REPORT PERIOD
- TOTAL EVENTS
- DOMINANT CONGESTION LEVEL
- HIGHEST RECORDED SEVERITY
- MODEL ACCURACY
- LATEST EVENT

The download button must actually download a report:
- If a backend download endpoint exists, use it.
- If no endpoint exists, generate CSV on the frontend from existing report data only.
- Use a meaningful filename like `netsense-congestion-report-YYYY-MM-DD.csv`.
- After successful download, briefly show `REPORT DOWNLOADED`.
- Do not leave a fake disabled button.

## Latency
- Do not create a large latency section when real latency data is unavailable.
- If real `latencyHistory` has at least two points, show a compact latency visualization only.
- If latency is unavailable, remove the large chart area or use a compact data-source-unavailable treatment. Prefer removing it if it does not add useful report information.
- Avoid huge empty chart boxes.

## Investigation Timeline
- Keep below the download/report area.
- Use existing real data.
- Columns must remain: TIMESTAMP, CONGESTION, CONFIDENCE, DURATION, STATUS.
- Keep compact and full-width.

## Final Flow
REPORT HEADER -> SUMMARY METRICS -> CONGESTION ANALYSIS horizontal section -> DOWNLOADABLE ANALYSIS PACKAGE -> INVESTIGATION TIMELINE -> existing insights if still useful.

## Quality Checks
Before finishing:
- Search for conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`.
- Run `npm run build` from `frontend`.
- Confirm `DashboardPage.tsx` was not modified.
- Confirm no backend files were modified.
- Report changed files and verification result.
