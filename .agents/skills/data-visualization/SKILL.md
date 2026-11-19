# Data Visualization Skill — Midterm / 2026

## Purpose
Design truthful, accessible data journalism graphics explaining 2026 congressional polling error and its methodological uncertainty.

## Visual encoding standards
1. Signed error definition: (result D−R margin) − (poll D−R margin), in *percentage points*; positive = Democratic margin understated, negative = Republican margin understated.
2. Do not confuse absolute errors, signed errors, vote shares, margin differences, prediction accuracy, or model forecasts.
3. Use a zero reference line for signed-error charts. For distributions use a diverging layout with equal scales left/right of 0. Label zero explicitly.
4. Show both uncertainty/evidence tier and denominator: ≥2 pollsters vs single-pollster exploratory. Never imply all 470 races were polled.
5. For small groups prefer exact dots and directly readable values. Provide a sortable accessible table alongside any chart.
6. Keep consistent partisan color semantics; don't rely on color alone, and avoid semantic red/green for accuracy claims.
7. Aggregate comparison should show five selection scenarios with their distinct race counts rather than presenting changes as if exactly the same population.
8. Suppress or annotate missing values. Missing polling is not a zero-error measurement.
9. Display units and data vintage prominently; cite original poll, published archive and source result URLs.
10. Never make a causal statement about poll methodology changes based solely on observed race error.

## Data pipeline expectations
- Use reproducible dated snapshots with provenance.
- Preserve raw polls and excluded observations.
- Respect licensure and original source attribution.
- Test scale bounds, sign convention, sorting, coverage status and no-data states.
- Prefer browser-native SVG/HTML over heavyweight chart libraries when appropriate for GitHub Pages.
