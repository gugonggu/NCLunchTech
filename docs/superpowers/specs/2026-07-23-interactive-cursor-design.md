# Interactive Cursor Design

## Goal

Give desktop users consistent pointer-cursor feedback for interactive controls without changing disabled or text-input behavior.

## Scope

- Apply `cursor: pointer` globally to enabled buttons, links with an `href`, elements with `role="button"`, and `summary` controls.
- Preserve the existing `not-allowed` cursor for disabled buttons.

## Exclusions

- Do not add hover animations or change control colors, spacing, or focus styles.
- Do not apply pointer cursors to text inputs, selects, textareas, or disabled controls.

## Verification

- Add a global-styles test asserting the interactive and disabled cursor selectors.
- Run lint, typecheck, tests, and build.
