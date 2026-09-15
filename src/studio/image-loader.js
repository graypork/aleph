const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg'])

export const UNSUPPORTED_FILE_MESSAGE = '지원하지 않는 파일입니다. PNG 또는 JPEG 파일을 사용해주세요.'
export const DECODE_FAILURE_MESSAGE = '이미지를 읽을 수 없습니다. 다른 PNG/JPEG 파일을 사용해주세요.'

export function isSupportedImageType(type) {
  return SUPPORTED_IMAGE_TYPES.has(String(type || '').toLowerCase())
}

export function validateImageFile(file) {
  if (!file || !isSupportedImageType(file.type)) {
    return { ok: false, reason: UNSUPPORTED_FILE_MESSAGE }
  }
  return { ok: true }
}

export async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }

  if (typeof Image === 'undefined' || typeof URL === 'undefined') {
    throw new Error('No browser image decoder is available')
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Image decode failed'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function prepareImageFile(file, decoder = decodeImageFile) {
  const validation = validateImageFile(file)
  if (!validation.ok) return validation

  try {
    const image = await decoder(file)
    return {
      ok: true,
      image,
      fileName: String(file.name || ''),
      mimeType: String(file.type || ''),
    }
  } catch {
    return { ok: false, reason: DECODE_FAILURE_MESSAGE }
  }
}
