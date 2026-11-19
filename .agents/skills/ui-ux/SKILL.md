# UI/UX Design Skill — Midterm / 2026

## Purpose
Design and implement user-friendly, accessible, responsive election data journalism interfaces on the existing HTML/CSS/JavaScript + GitHub Pages site.

## Required workflow
1. Inspect existing pages, stylesheet tokens, and navigation before changing layouts.
2. Define reader tasks: discover finding → compare methodology → inspect race → follow original source → understand caveats.
3. Use clear information hierarchy: question-led heading, explicit data date, scope labels, one primary interaction per section.
4. Mobile first: 320px minimum functional width, no horizontal page overflow, tap targets approximately 44px, stable controls, charts with scrollable or tabular fallback.
5. Accessibility: semantic landmarks, label/input associations, keyboard accessible filters, focus-visible states, descriptive chart summaries, sufficient contrast, skip links and reduced motion.
6. States: loading, missing poll, incomparable race, insufficient evidence, failed fetch, and ready; never replace missing data with 0.
7. Preserve existing site identity and do not introduce an unneeded UI framework.
8. Test filter flows, query link navigation, empty searches, reset, responsive design, and keyboard order.
9. Deliver user-facing artifacts and concise change notes; do not claim manual or visual QA without doing it.

## Editorial UX rules
- Distinguish provisional returns, certified results, survey poll averages, and forecast model predictions.
- One visibly selected methodology at a time; show denominator/eligible races next to aggregate measures.
- Keep a direct path to full methodology and CSV/source links.
- No decorative warning colors; accessible explanatory text is mandatory.
- Political data interfaces must be neutral and never use unsupported inference about voters or results.
