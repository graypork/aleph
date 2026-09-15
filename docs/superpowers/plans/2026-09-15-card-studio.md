# Card Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public `/studio/` card-image editor that meets T03-C01 and T03-C03-C32 without changing existing `/play/` behavior.

**Architecture:** Add a third Vite HTML entry and a focused `src/studio/` module set. A single editor-state model feeds one shared canvas renderer used by both preview and export; templates persist locally, JSON import is fully validated before mutation, and image import replaces state only after validation/decode succeeds.

**Tech Stack:** Vite 8, browser Canvas 2D API, ES modules, localStorage, Node built-in `node:test`/`assert`.

**Spec:** `docs/superpowers/specs/2026-09-15-card-studio-design.md`

## Global Constraints
- Public route is `/studio/` and requires no authentication.
- Accepted image types are only PNG and JPEG.
- Export sizes are exactly 1080×1080, 1080×1350, 1080×1920.
- Preview and export must share the same renderer and logical coordinates.
- Invalid files and invalid JSON must not erase current work/templates.
- Template records use stable IDs and persist under `card-studio:templates:v1`.
- Assignment 02 `/play/` and ranking API behavior must remain unchanged.
- No personal information or secret values may be introduced.

---

### Task 1: Studio entry point and assignment navigation

**Files:**
- Create: `studio/index.html`
- Create: `src/studio/studio.css`
- Create: `src/studio/studio.js`
- Modify: `vite.config.js`
- Modify: `src/assignment-link.js`
- Test: `tests/studio-requirements.test.js`

**Interfaces:**
- Produces page elements with ids: `image-input`, `text-input`, `text-x`, `text-y`, `text-size`, `text-color`, `aspect-controls`, `preview-canvas`, `template-list`, `studio-status`.

- [ ] Write a failing `node:test` that reads `studio/index.html`, `vite.config.js`, and `src/assignment-link.js` and asserts the visible first-screen control IDs, the `studio` Vite input, and an `ASSIGNMENT 03` `/studio/` link.
- [ ] Run `node --test tests/studio-requirements.test.js` and verify failure because the studio files/input do not exist.
- [ ] Create the minimal semantic HTML/editor shell and CSS; add `studio: resolve(root, 'studio/index.html')` to Vite; extend hero actions to append Assignment 03 without removing Assignment 02.
- [ ] Run the test and verify pass.
- [ ] Run existing `node --test tests/*.test.js` to ensure the game/home suite still passes.

### Task 2: Canonical state, aspect dimensions, and shared render geometry

**Files:**
- Create: `src/studio/state.js`
- Create: `src/studio/renderer.js`
- Test: `tests/studio-renderer.test.js`

**Interfaces:**
- `createDefaultStudioState()` → state object.
- `getAspectDimensions(aspect)` → `{ width, height }`.
- `computeCoverRect(imageWidth, imageHeight, canvasWidth, canvasHeight)` → draw rect.
- `wrapText(ctx, text, maxWidth)` → array of lines.
- `renderComposition(ctx, state, image, dimensions)` → draws image/text.

- [ ] Write failing tests for all three exact dimensions, center-cover crop math, explicit line breaks, long-token character wrapping, and empty text.
- [ ] Run `node --test tests/studio-renderer.test.js` and verify failure.
- [ ] Implement minimal helpers and renderer using percentage x/y and 1080-based font sizing.
- [ ] Run renderer tests and verify pass.

### Task 3: Safe PNG/JPEG import with state preservation

**Files:**
- Create: `src/studio/image-loader.js`
- Modify: `src/studio/studio.js`
- Test: `tests/studio-image.test.js`

**Interfaces:**
- `isSupportedImageType(type)` → boolean.
- `validateImageFile(file)` → `{ ok, reason }`.
- `decodeImageFile(file)` → Promise of decoded image handle.
- Studio controller only swaps current image after validation and successful decode.

- [ ] Write failing tests asserting PNG/JPEG acceptance, `text/plain` rejection reason, and no state mutation when validation fails.
- [ ] Run the image test and verify failure.
- [ ] Implement MIME validation/decode and wire file input so existing image/editor state remains when validation or decode fails.
- [ ] Run image tests and full suite.

### Task 4: Live editor controls and exact preview/export parity

**Files:**
- Create: `src/studio/download.js`
- Modify: `src/studio/studio.js`
- Modify: `src/studio/studio.css`
- Test: `tests/studio-controls.test.js`

**Interfaces:**
- `exportComposition({ state, image, type })` creates an offscreen canvas at exact aspect dimensions and calls `renderComposition`.
- Every text/aspect control updates state then calls `renderPreview()` synchronously.

- [ ] Write failing tests for control ranges, aspect values, export MIME mapping, and use of `renderComposition` by both preview/export paths.
- [ ] Run and verify failure.
- [ ] Wire text content, X/Y, size, color, ratio controls; add PNG/JPEG buttons; implement offscreen export via `canvas.toBlob`.
- [ ] Run tests and full suite.
- [ ] Manual browser check: for 1:1, 4:5, 9:16 use an edge-positioned wrapped caption and compare preview against downloaded output for crop, position, and line breaks.

### Task 5: Template CRUD with durable stable IDs

**Files:**
- Create: `src/studio/templates.js`
- Modify: `src/studio/studio.js`
- Test: `tests/studio-templates.test.js`

**Interfaces:**
- `loadTemplateStore(storage)` → normalized store.
- `createTemplate(store, draft, name, now, idFactory)` → updated store.
- `updateTemplate(store, id, draft, now)` → updated store.
- `deleteTemplate(store, id)` → updated store.
- `saveTemplateStore(storage, store)`.

- [ ] Write failing tests creating 3 templates, loading one, updating by stable ID after array order changes, deleting one, reload persistence, and corrupt-localStorage fallback.
- [ ] Run and verify failure.
- [ ] Implement storage model and UI buttons for save/load/update/delete.
- [ ] Run template tests and full suite.

### Task 6: Transactional JSON export/import

**Files:**
- Create: `src/studio/template-schema.js`
- Create: `src/studio/json-transfer.js`
- Modify: `src/studio/studio.js`
- Test: `tests/studio-json.test.js`

**Interfaces:**
- `validateTemplateStore(value)` → `{ ok, value?, error? }`.
- `serializeTemplateStore(store)` → JSON string.
- `parseTemplateImport(text)` → validated store or typed error; never mutates storage itself.

- [ ] Write failing tests for valid round-trip, malformed JSON rejection, missing required field rejection, invalid aspect/color/number rejection, and unchanged previous store on all failures.
- [ ] Run and verify failure.
- [ ] Implement strict schema validation and transactional import UI; only persist after full validation succeeds.
- [ ] Run JSON tests and full suite.

### Task 7: Extreme-input evidence and representative FAIL→PASS

**Files:**
- Create: `evidence/card-studio-extreme-inputs.md`
- Test: `tests/studio-extremes.test.js`

**Interfaces:**
- Evidence table uses columns: `#`, `입력`, `예상`, `결과`, `비고`.

- [ ] Write a failing test asserting the evidence file contains exactly 12 numbered cases and both `FAIL (수정 전)` and `PASS (수정 후)` for the same long-token input.
- [ ] Run and verify failure.
- [ ] Add the 12-case evidence table mapped to the spec; use long unbroken token overflow as the before/after defect tied to renderer wrapping.
- [ ] Run evidence test and full suite.

### Task 8: Finished-image samples and metadata/public-safety checks

**Files:**
- Create: `scripts/generate-studio-evidence.mjs`
- Create: `evidence/card-studio-rights.md`
- Generate: `evidence/card-studio-output-1-square.png`
- Generate: `evidence/card-studio-output-2-feed.png`
- Generate: `evidence/card-studio-output-3-story.png`
- Test: `tests/studio-evidence.test.js`

**Interfaces:**
- Evidence generator creates three valid PNGs at exact target dimensions using only geometric backgrounds/text owned by the student.

- [ ] Write failing tests checking the three evidence PNG files exist, have PNG signatures, exact IHDR dimensions, and rights file marks each as `본인 제작`.
- [ ] Run and verify failure.
- [ ] Implement a dependency-free Node PNG generator (zlib + CRC32) for geometric sample images and generate the three files; record rights.
- [ ] Run evidence tests and full suite.
- [ ] Inspect generated PNG chunks and assert no `eXIf`, `tEXt` GPS/location, or secret-looking metadata is present.

### Task 9: Final requirements scan, build, and handoff package

**Files:**
- Modify: `tests/studio-requirements.test.js`
- Create: `APPLY-FIX-ASSIGNMENT-03.md`
- Create package artifact outside repo: `assignment-03-card-studio.zip`

**Interfaces:**
- Package overlays only Assignment 03 files plus required Vite/home-link edits; it must not overwrite game source unrelated to navigation.

- [ ] Add requirement assertions covering visible editor controls, error copy, template/JSON controls, no auth UI, and no hard-coded secrets/PII in new public files.
- [ ] Run `node --test tests/*.test.js` and require 0 failures.
- [ ] Run `npm ci` then `npm run build`; require Vite build success with `dist/studio/index.html` present.
- [ ] Package changed files into `assignment-03-card-studio.zip` with an apply guide.
- [ ] After user applies/pushes, verify `https://whogh.vercel.app/studio/` in a fresh incognito window and complete manual C01, C11-C13, C25-C30 checks before drafting final 4-line verification and 3-line AI/user judgment.
