# Assignment 03 — Card Studio Design

## Goal
Add a public, no-login image/card editor at `/studio/` to the existing `graypork/aleph` Vite multi-page project. The tool must import PNG/JPEG, edit one Korean text layer, preview/export consistently in 1:1, 4:5, 9:16, preserve user templates with CRUD, safely import/export JSON, and provide evidence for the 12 extreme-input checks.

## Non-goals
- No user accounts, server database, cloud sync, collaboration, AI generation, sticker library, filters, arbitrary rotation, multi-layer text, or image drag/zoom editor.
- Do not alter `/play/` game logic or its ranking API.

## Route and build integration
- New public route: `/studio/`
- Add `studio/index.html` to Vite `rollupOptions.input` beside `main` and `play`.
- Add a small `ASSIGNMENT 03 · CARD STUDIO →` link to the home hero without removing the Assignment 02 link.

## UI layout
Desktop-first responsive two-column editor:
- Left: file input, text input, X/Y position, size, color, aspect selector, template actions, JSON actions, PNG/JPEG download actions, status/error area.
- Right: live canvas preview and compact template list.
- On narrow widths, stack controls above preview.

First screen must visibly include the image editor controls and text editor controls to satisfy T03-C03.

## Canonical editor state
One serializable state object is the single source of truth:

```js
{
  aspect: '1:1',
  text: {
    content: '오늘의 한 줄',
    x: 50,
    y: 72,
    size: 72,
    color: '#ffffff'
  },
  image: {
    source: null,
    fileName: '',
    mimeType: ''
  }
}
```

- `x` and `y` are percentages from 0 to 100.
- `size` is defined against a 1080px-wide export canvas.
- Image binary/object URL stays in runtime memory only and is not stored in templates or JSON.

## Supported aspect ratios
Export dimensions are fixed:
- 1:1 = 1080×1080
- 4:5 = 1080×1350
- 9:16 = 1080×1920

Preview uses the same logical coordinates and render function as export, scaled down by CSS. This prevents preview/download drift.

## Renderer
A pure-ish `renderComposition(ctx, state, image, dimensions)` function draws:
1. Background fallback fill.
2. Imported image with center-crop `cover` behavior.
3. Text layer using the same font, wrap width, line-height, and anchor calculation for preview and export.

Text wrapping rules:
- Explicit `\n` always starts a new line.
- Otherwise wrap by measured width.
- Long unbroken tokens fall back to character-level splitting.
- Empty text draws nothing and is valid.
- Emoji/mixed Korean-English rely on a system sans-serif fallback stack.

## Image import and invalid file safety
Accepted MIME types:
- `image/png`
- `image/jpeg`

Flow:
1. Validate MIME before replacing current image.
2. Decode with `createImageBitmap` when available, fallback to `Image` object URL.
3. Only after successful decode replace current image state.
4. Unsupported or undecodable files show an error and preserve the previous edit and previous image.

This directly supports T03-C04, C05, C09, C10, and C16.

## Metadata/public safety
The app never republishes the original uploaded file. Export always creates a new canvas bitmap and downloads via `canvas.toBlob`, so original EXIF/GPS metadata is not copied into the exported PNG/JPEG.

Public UI contains no personal data and no secret values. No API keys or server secrets are required for Assignment 03.

## Template model and persistence
Templates persist in `localStorage` key `card-studio:templates:v1`.

```js
{
  version: 1,
  templates: [
    {
      id: 'tpl_<uuid>',
      name: '하단 자막 카드',
      aspect: '4:5',
      text: {
        content: '오늘도 계획만 세웠다',
        x: 50,
        y: 80,
        size: 72,
        color: '#ffffff'
      },
      createdAt: 'ISO',
      updatedAt: 'ISO'
    }
  ]
}
```

Rules:
- Stable IDs, never array indexes.
- Create, load, update, delete.
- Save after each mutation.
- Corrupt stored data falls back to an empty valid collection without crashing.
- Image files are intentionally not persisted in templates; a loaded template restores layout/text settings and prompts the user to choose an image if needed.

## JSON transfer
Export JSON contains `{ version: 1, templates: [...] }`.

Import is transactional:
1. Parse JSON.
2. Validate root/version/templates array.
3. Validate every template and all required fields/ranges.
4. If any item fails, show error and do not mutate localStorage or in-memory templates.
5. If all pass, replace the template collection and persist once.

This satisfies T03-C22-C24.

## Extreme-input evidence
Keep a repository evidence file `evidence/card-studio-extreme-inputs.md` with 12 deterministic checks:
1. long Korean text
2. long English text
3. mixed Korean/English
4. explicit line breaks
5. emoji
6. empty text
7. special characters
8. long unbroken token
9. portrait JPEG
10. landscape JPEG
11. transparent PNG
12. unsupported text/plain file

Representative FAIL→PASS evidence: long unbroken text originally overflows; after character-level fallback wrapping, the same input passes.

Automated tests verify state preservation/validation and renderer geometry helpers. Visual preview-vs-export comparison remains a manual browser check because Canvas pixel output depends on browser font rasterization.

## Finished-image evidence
Provide three generated sample outputs using only app-generated geometric backgrounds/text so rights are unambiguous:
- `evidence/card-studio-output-1-square.png`
- `evidence/card-studio-output-2-feed.png`
- `evidence/card-studio-output-3-story.png`

Each is recorded as “본인 제작”. Exported files must open successfully and contain no EXIF/GPS metadata.

## Error messages
- Unsupported file: `지원하지 않는 파일입니다. PNG 또는 JPEG 파일을 사용해주세요.`
- Decode failure: `이미지를 읽을 수 없습니다. 다른 PNG/JPEG 파일을 사용해주세요.`
- Invalid template name: `템플릿 이름을 입력해주세요.`
- Invalid JSON syntax: `JSON 문법이 올바르지 않습니다. 기존 템플릿은 유지됩니다.`
- Invalid JSON schema: `필수 항목이 빠졌거나 형식이 올바르지 않습니다. 기존 템플릿은 유지됩니다.`

## Test mapping
- T03-C01: after deployment, open both result and source URLs in a fresh incognito window with no authentication.
- T03-C03: editor DOM test asserts image and text tools are visible on the first screen.
- T03-C04: PNG acceptance test plus manual PNG import.
- T03-C05: JPEG acceptance test plus manual JPEG import.
- T03-C06: X/Y control change mutates state and re-renders preview immediately.
- T03-C07: size control change mutates state and re-renders preview immediately.
- T03-C08: color control change mutates state and re-renders preview immediately.
- T03-C09: unsupported-file test asserts prior image/edit state remains unchanged.
- T03-C10: unsupported-file test asserts the rejection reason is visible.
- T03-C11: 1:1 shared-render geometry test plus manual preview/download comparison.
- T03-C12: 4:5 shared-render geometry test plus manual preview/download comparison.
- T03-C13: 9:16 shared-render geometry test plus manual preview/download comparison.
- T03-C14: evidence table contains 12 required extreme-input checks.
- T03-C15: evidence table records one same-input FAIL-before/PASS-after case.
- T03-C16: invalid-extreme-input test asserts current edit state is not silently erased.
- T03-C17: template tests create at least three templates.
- T03-C18: template tests load a created template back into editor state.
- T03-C19: template tests update a created template by stable ID.
- T03-C20: template tests delete a created template by stable ID.
- T03-C21: storage reload test proves CRUD results survive refresh-equivalent reload.
- T03-C22: valid JSON round-trip restores templates.
- T03-C23: malformed JSON is rejected before storage mutation and prior templates remain.
- T03-C24: missing-required-field JSON is rejected before storage mutation and prior templates remain.
- T03-C25: exactly three finished sample images use different ratio and/or text.
- T03-C26: PNG signature/IHDR tests prove all three sample files are valid/openable images.
- T03-C27: rights evidence records all three samples as `본인 제작`.
- T03-C28: PNG chunk/metadata inspection verifies zero EXIF/GPS location metadata in public sample files.
- T03-C29: new public UI/evidence string scan verifies zero personal information.
- T03-C30: new public/build-source string scan verifies zero raw secret values.
- T03-C31: final four-line verification is drafted only after deployed behavior is manually verified.
- T03-C32: final three-line AI/student judgment is drafted only after implementation decisions are final.

## Deployment target
- Result: `https://whogh.vercel.app/studio/`
- Source: `https://github.com/graypork/aleph`
