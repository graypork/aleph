import { validateTemplateStore } from './template-schema.js'

export const TEMPLATE_STORAGE_KEY = 'card-studio:templates:v1'

export function emptyTemplateStore() {
  return { version: 1, templates: [] }
}

function cloneDraft(draft) {
  return {
    aspect: draft.aspect,
    text: {
      content: String(draft.text.content ?? ''),
      x: Number(draft.text.x),
      y: Number(draft.text.y),
      size: Number(draft.text.size),
      color: String(draft.text.color),
    },
  }
}

function cloneTemplate(template) {
  return {
    id: String(template.id),
    name: String(template.name),
    ...cloneDraft(template),
    createdAt: String(template.createdAt),
    updatedAt: String(template.updatedAt),
  }
}


export function loadTemplateStore(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(TEMPLATE_STORAGE_KEY)
    if (!raw) return emptyTemplateStore()
    const parsed = JSON.parse(raw)
    const validation = validateTemplateStore(parsed)
    if (!validation.ok) return emptyTemplateStore()
    return { version: 1, templates: validation.value.templates.map(cloneTemplate) }
  } catch {
    return emptyTemplateStore()
  }
}

export function saveTemplateStore(storage = globalThis.localStorage, store) {
  storage?.setItem?.(TEMPLATE_STORAGE_KEY, JSON.stringify(store))
  return store
}

function defaultIdFactory() {
  if (globalThis.crypto?.randomUUID) return `tpl_${globalThis.crypto.randomUUID()}`
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function createTemplate(store, draft, name, now = new Date().toISOString(), idFactory = defaultIdFactory) {
  const cleanName = String(name ?? '').trim()
  if (!cleanName) throw new Error('템플릿 이름을 입력해주세요.')
  const template = {
    id: String(idFactory()),
    name: cleanName,
    ...cloneDraft(draft),
    createdAt: String(now),
    updatedAt: String(now),
  }
  return { version: 1, templates: [...store.templates.map(cloneTemplate), template] }
}

export function findTemplate(store, id) {
  const found = store.templates.find(template => template.id === id)
  return found ? cloneTemplate(found) : null
}

export function updateTemplate(store, id, draft, now = new Date().toISOString(), name) {
  const index = store.templates.findIndex(template => template.id === id)
  if (index < 0) throw new Error('수정할 템플릿을 찾을 수 없습니다.')
  const current = store.templates[index]
  const nextName = name === undefined ? current.name : String(name).trim()
  if (!nextName) throw new Error('템플릿 이름을 입력해주세요.')
  return {
    version: 1,
    templates: store.templates.map(template => template.id === id
      ? {
          id: current.id,
          name: nextName,
          ...cloneDraft(draft),
          createdAt: current.createdAt,
          updatedAt: String(now),
        }
      : cloneTemplate(template)),
  }
}

export function deleteTemplate(store, id) {
  return { version: 1, templates: store.templates.filter(template => template.id !== id).map(cloneTemplate) }
}
