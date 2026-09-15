import './studio.css'
import { createDefaultStudioState, copyTemplateDraft, applyTemplateDraft } from './state.js'
import { getAspectDimensions, renderStudioCanvas } from './renderer.js'
import { prepareImageFile } from './image-loader.js'
import { downloadComposition } from './download.js'
import {
  loadTemplateStore,
  saveTemplateStore,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  findTemplate,
} from './templates.js'
import { serializeTemplateStore, parseTemplateImport } from './json-transfer.js'

const state = createDefaultStudioState()
let templateStore = loadTemplateStore(window.localStorage)
let selectedTemplateId = null

const previewCanvas = document.querySelector('#preview-canvas')
const statusNode = document.querySelector('#studio-status')
const imageInput = document.querySelector('#image-input')
const textInput = document.querySelector('#text-input')
const textX = document.querySelector('#text-x')
const textY = document.querySelector('#text-y')
const textSize = document.querySelector('#text-size')
const textColor = document.querySelector('#text-color')
const aspectControls = document.querySelector('#aspect-controls')
const ratioLabel = document.querySelector('#preview-ratio-label')
const templateName = document.querySelector('#template-name')
const templateList = document.querySelector('#template-list')
const templateCount = document.querySelector('#template-count')
const jsonImport = document.querySelector('#json-import')

function setStatus(message, kind = 'info') {
  if (!statusNode) return
  statusNode.textContent = message
  statusNode.dataset.kind = kind
}

function updateControlOutputs() {
  const xOutput = document.querySelector('#text-x-value')
  const yOutput = document.querySelector('#text-y-value')
  const sizeOutput = document.querySelector('#text-size-value')
  if (xOutput) xOutput.textContent = `${state.text.x}%`
  if (yOutput) yOutput.textContent = `${state.text.y}%`
  if (sizeOutput) sizeOutput.textContent = `${state.text.size}px`
}

function renderPreview() {
  if (!previewCanvas) return
  const dimensions = renderStudioCanvas(previewCanvas, state, state.image.source)
  if (ratioLabel) ratioLabel.textContent = `${state.aspect} · ${dimensions.width} × ${dimensions.height}`
}

function syncInputsFromState() {
  if (textInput) textInput.value = state.text.content
  if (textX) textX.value = String(state.text.x)
  if (textY) textY.value = String(state.text.y)
  if (textSize) textSize.value = String(state.text.size)
  if (textColor) textColor.value = state.text.color
  aspectControls?.querySelectorAll('[data-aspect]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.aspect === state.aspect))
  })
  updateControlOutputs()
  renderPreview()
}

function persistTemplates() {
  saveTemplateStore(window.localStorage, templateStore)
}

function renderTemplateList() {
  if (!templateList || !templateCount) return
  templateCount.textContent = `${templateStore.templates.length}개`
  templateList.replaceChildren()

  if (templateStore.templates.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty-state'
    empty.textContent = '저장된 템플릿이 없습니다.'
    templateList.append(empty)
    return
  }

  for (const template of templateStore.templates) {
    const row = document.createElement('article')
    row.className = 'template-card'
    if (template.id === selectedTemplateId) row.dataset.selected = 'true'

    const info = document.createElement('button')
    info.type = 'button'
    info.className = 'template-load'
    info.dataset.templateId = template.id
    info.innerHTML = `<strong></strong><span></span>`
    info.querySelector('strong').textContent = template.name
    info.querySelector('span').textContent = `${template.aspect} · ${template.text.size}px`

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'template-delete'
    remove.dataset.deleteTemplate = template.id
    remove.setAttribute('aria-label', `${template.name} 삭제`)
    remove.textContent = '삭제'

    row.append(info, remove)
    templateList.append(row)
  }
}

if (imageInput) {
  imageInput.addEventListener('change', async event => {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    const candidate = await prepareImageFile(file)
    if (!candidate.ok) {
      setStatus(candidate.reason, 'error')
      event.currentTarget.value = ''
      return
    }

    const previousSource = state.image.source
    state.image = {
      source: candidate.image,
      fileName: candidate.fileName,
      mimeType: candidate.mimeType,
    }
    if (previousSource && previousSource !== candidate.image && typeof previousSource.close === 'function') previousSource.close()
    setStatus(`${candidate.fileName || '이미지'}를 불러왔습니다.`)
    renderPreview()
  })
}

textInput?.addEventListener('input', event => {
  state.text.content = event.currentTarget.value
  renderPreview()
})

textX?.addEventListener('input', event => {
  state.text.x = Number(event.currentTarget.value)
  updateControlOutputs()
  renderPreview()
})

textY?.addEventListener('input', event => {
  state.text.y = Number(event.currentTarget.value)
  updateControlOutputs()
  renderPreview()
})

textSize?.addEventListener('input', event => {
  state.text.size = Number(event.currentTarget.value)
  updateControlOutputs()
  renderPreview()
})

textColor?.addEventListener('input', event => {
  state.text.color = event.currentTarget.value
  renderPreview()
})

aspectControls?.addEventListener('click', event => {
  const button = event.target.closest('[data-aspect]')
  if (!button) return
  state.aspect = button.dataset.aspect
  syncInputsFromState()
})

async function handleDownload(type) {
  try {
    await downloadComposition({ state, image: state.image.source, type, fileName: `card-studio-${state.aspect.replace(':', 'x')}` })
    setStatus(`${type === 'png' ? 'PNG' : 'JPEG'} 파일을 저장했습니다.`)
  } catch {
    setStatus('이미지를 저장하지 못했습니다. 다시 시도해주세요.', 'error')
  }
}

document.querySelector('#download-png')?.addEventListener('click', () => handleDownload('png'))
document.querySelector('#download-jpeg')?.addEventListener('click', () => handleDownload('jpeg'))

document.querySelector('#template-create')?.addEventListener('click', () => {
  try {
    templateStore = createTemplate(templateStore, copyTemplateDraft(state), templateName?.value ?? '')
    selectedTemplateId = templateStore.templates.at(-1)?.id ?? null
    persistTemplates()
    renderTemplateList()
    setStatus('템플릿을 저장했습니다. 이미지 원본은 템플릿에 포함되지 않습니다.')
  } catch (error) {
    setStatus(error.message || '템플릿을 저장하지 못했습니다.', 'error')
  }
})

document.querySelector('#template-update')?.addEventListener('click', () => {
  if (!selectedTemplateId) {
    setStatus('먼저 수정할 템플릿을 목록에서 불러와주세요.', 'error')
    return
  }
  try {
    templateStore = updateTemplate(templateStore, selectedTemplateId, copyTemplateDraft(state), undefined, templateName?.value)
    persistTemplates()
    renderTemplateList()
    setStatus('선택한 템플릿을 현재 편집 내용으로 수정했습니다.')
  } catch (error) {
    setStatus(error.message || '템플릿을 수정하지 못했습니다.', 'error')
  }
})

templateList?.addEventListener('click', event => {
  const loadButton = event.target.closest('[data-template-id]')
  if (loadButton) {
    const template = findTemplate(templateStore, loadButton.dataset.templateId)
    if (!template) return
    selectedTemplateId = template.id
    applyTemplateDraft(state, template)
    if (templateName) templateName.value = template.name
    syncInputsFromState()
    renderTemplateList()
    setStatus('템플릿을 불러왔습니다. 이미지가 필요하면 PNG/JPEG를 선택해주세요.')
    return
  }

  const deleteButton = event.target.closest('[data-delete-template]')
  if (deleteButton) {
    const id = deleteButton.dataset.deleteTemplate
    templateStore = deleteTemplate(templateStore, id)
    if (selectedTemplateId === id) {
      selectedTemplateId = null
      if (templateName) templateName.value = ''
    }
    persistTemplates()
    renderTemplateList()
    setStatus('템플릿을 삭제했습니다.')
  }
})

function downloadText(text, fileName, mimeType) {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

document.querySelector('#json-export')?.addEventListener('click', () => {
  try {
    downloadText(serializeTemplateStore(templateStore), 'card-studio-templates.json', 'application/json;charset=utf-8')
    setStatus('템플릿 JSON을 내보냈습니다.')
  } catch {
    setStatus('템플릿 JSON을 만들지 못했습니다.', 'error')
  }
})

jsonImport?.addEventListener('change', async event => {
  const file = event.currentTarget.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const result = parseTemplateImport(text)
    if (!result.ok) {
      setStatus(result.message, 'error')
      return
    }
    templateStore = result.value
    selectedTemplateId = null
    persistTemplates()
    renderTemplateList()
    setStatus(`JSON에서 템플릿 ${templateStore.templates.length}개를 복원했습니다.`)
  } catch {
    setStatus('JSON 파일을 읽을 수 없습니다. 기존 템플릿은 유지됩니다.', 'error')
  } finally {
    event.currentTarget.value = ''
  }
})

window.cardStudio = {
  getState: () => structuredClone({ ...state, image: { ...state.image, source: null } }),
  getDimensions: () => getAspectDimensions(state.aspect),
  getTemplateCount: () => templateStore.templates.length,
}

syncInputsFromState()
renderTemplateList()
