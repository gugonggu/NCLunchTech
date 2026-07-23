# Interactive Cursor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give interactive controls pointer-cursor feedback.

**Architecture:** Add one scoped selector to global CSS and prove it through the existing global-styles test file.

**Tech Stack:** Tailwind CSS 4, Vitest.

## Global Constraints

- Keep disabled buttons on `cursor: not-allowed`.
- Do not change layout, colors, motion, or input cursor behavior.

---

### Task 1: Apply interactive cursors

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/globals.test.ts`

- [ ] **Step 1: Write the failing global-style test**

```ts
expect(css).toMatch(/button:not\(:disabled\),\s*a\[href\],\s*\[role="button"\],\s*summary\s*\{\s*cursor:\s*pointer;/);
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd run test -- src/app/globals.test.ts`

Expected: FAIL because the selector is absent.

- [ ] **Step 3: Add the minimal global selector**

```css
button:not(:disabled),
a[href],
[role="button"],
summary {
  cursor: pointer;
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm.cmd run test -- src/app/globals.test.ts && npm.cmd run lint && npm.cmd run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/globals.css src/app/globals.test.ts && git commit -m "style: add interactive cursors"`
