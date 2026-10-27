# Keychats Hero Position Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the existing blue Keychats CTA from below the hero evidence row into the open right side of the hero copy on desktop, while preserving mobile usability, `/chats` routing, and Assignment 8 passkey functionality.

**Architecture:** Keep the existing dynamically-created Keychats link and routing unchanged. Use hero-relative responsive CSS positioning so only presentation changes; on narrower screens the CTA returns to normal document flow.

**Tech Stack:** Vite, vanilla JavaScript, CSS, Node test runner, Vercel

**Spec:** User-provided annotated screenshot in the 2026-10-27 conversation.

## Global Constraints
- Do not change `/chats` routing.
- Do not alter Assignment 8 passkey code.
- Desktop CTA should sit in the right-side blank area of the hero.
- Mobile CTA must remain in normal flow and usable.

## Review Focus
- CTA must not overlap the hero heading at common desktop widths.
- CTA must remain reachable on mobile.
- Existing assignment links must stay in the evidence row.
- `/chats` must still return the Keychats page.
- Assignment 8 tests must continue to pass.

---

### Task 1: Hero CTA positioning

**Files:**
- Modify: `src/assignment-link.css`
- Modify: `tests/keychats-entry.test.js`

- [ ] Add a failing regression test requiring desktop right-side positioning and mobile flow reset.
- [ ] Verify the new test fails.
- [ ] Add minimal responsive CSS to position the CTA in the requested hero area.
- [ ] Run the full test/build suite and verify success.
- [ ] Deploy preview, inspect the built CSS and `/chats`, then merge to `main`.
