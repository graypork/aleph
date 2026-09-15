import { renderStudioCanvas } from './renderer.js'

const MIME_BY_TYPE = Object.freeze({
  png: 'image/png',
  jpeg: 'image/jpeg',
})

export function getExportMime(type) {
  const mime = MIME_BY_TYPE[type]
  if (!mime) throw new Error('지원하지 않는 내보내기 형식입니다.')
  return mime
}

function makeCanvas() {
  if (typeof document === 'undefined') throw new Error('브라우저 Canvas가 필요합니다.')
  return document.createElement('canvas')
}

export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('이미지 파일을 만들지 못했습니다.'))
    }, mimeType, quality)
  })
}

export async function exportComposition({ state, image, type, canvasFactory = makeCanvas }) {
  const mimeType = getExportMime(type)
  const canvas = canvasFactory()
  renderStudioCanvas(canvas, state, image)
  const quality = type === 'jpeg' ? 0.92 : undefined
  return canvasToBlob(canvas, mimeType, quality)
}

export async function downloadComposition({ state, image, type, fileName = 'card-studio' }) {
  const blob = await exportComposition({ state, image, type })
  const extension = type === 'jpeg' ? 'jpg' : 'png'
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${fileName}.${extension}`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
