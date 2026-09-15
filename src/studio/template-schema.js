const ASPECTS = new Set(['1:1', '4:5', '9:16'])
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function fail() {
  return { ok: false, error: '필수 항목이 빠졌거나 형식이 올바르지 않습니다.' }
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max
}

function validateTemplate(template) {
  if (!template || typeof template !== 'object' || Array.isArray(template)) return null
  if (typeof template.id !== 'string' || !template.id.trim() || template.id.length > 120) return null
  if (typeof template.name !== 'string' || !template.name.trim() || template.name.length > 40) return null
  if (!ASPECTS.has(template.aspect)) return null
  if (!template.text || typeof template.text !== 'object' || Array.isArray(template.text)) return null
  if (typeof template.text.content !== 'string') return null
  if (!inRange(template.text.x, 0, 100) || !inRange(template.text.y, 0, 100)) return null
  if (!inRange(template.text.size, 24, 180)) return null
  if (typeof template.text.color !== 'string' || !HEX_COLOR.test(template.text.color)) return null
  if (typeof template.createdAt !== 'string' || !template.createdAt) return null
  if (typeof template.updatedAt !== 'string' || !template.updatedAt) return null

  return {
    id: template.id,
    name: template.name.trim(),
    aspect: template.aspect,
    text: {
      content: template.text.content,
      x: template.text.x,
      y: template.text.y,
      size: template.text.size,
      color: template.text.color.toLowerCase(),
    },
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

export function validateTemplateStore(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.templates)) return fail()

  const templates = []
  const ids = new Set()
  for (const item of value.templates) {
    const template = validateTemplate(item)
    if (!template || ids.has(template.id)) return fail()
    ids.add(template.id)
    templates.push(template)
  }

  return { ok: true, value: { version: 1, templates } }
}
