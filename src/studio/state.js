export const DEFAULT_TEXT = Object.freeze({
  content: '오늘의 한 줄',
  x: 50,
  y: 72,
  size: 72,
  color: '#ffffff',
})

export function createDefaultStudioState() {
  return {
    aspect: '1:1',
    text: { ...DEFAULT_TEXT },
    image: { source: null, fileName: '', mimeType: '' },
  }
}

export function copyTemplateDraft(state) {
  return {
    aspect: state.aspect,
    text: {
      content: String(state.text.content ?? ''),
      x: Number(state.text.x),
      y: Number(state.text.y),
      size: Number(state.text.size),
      color: String(state.text.color),
    },
  }
}

export function applyTemplateDraft(state, draft) {
  state.aspect = draft.aspect
  state.text = { ...draft.text }
  return state
}
