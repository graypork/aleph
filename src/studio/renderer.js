const ASPECT_DIMENSIONS = Object.freeze({
  '1:1': Object.freeze({ width: 1080, height: 1080 }),
  '4:5': Object.freeze({ width: 1080, height: 1350 }),
  '9:16': Object.freeze({ width: 1080, height: 1920 }),
})

export function getAspectDimensions(aspect) {
  const dimensions = ASPECT_DIMENSIONS[aspect]
  if (!dimensions) throw new Error('지원하지 않는 화면비입니다.')
  return { ...dimensions }
}

export function computeCoverRect(imageWidth, imageHeight, canvasWidth, canvasHeight) {
  if (![imageWidth, imageHeight, canvasWidth, canvasHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('이미지와 캔버스 크기는 0보다 커야 합니다.')
  }
  const scale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    x: (canvasWidth - width) / 2,
    y: (canvasHeight - height) / 2,
    width,
    height,
  }
}

function splitOversizedToken(ctx, token, maxWidth) {
  const chunks = []
  let current = ''
  for (const character of Array.from(token)) {
    const next = current + character
    if (current && ctx.measureText(next).width > maxWidth) {
      chunks.push(current)
      current = character
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks
}

function wrapParagraph(ctx, paragraph, maxWidth) {
  if (paragraph === '') return ['']
  const words = paragraph.trim().split(/\s+/u)
  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate
      continue
    }

    if (current) {
      lines.push(current)
      current = ''
    }

    if (ctx.measureText(word).width <= maxWidth) {
      current = word
      continue
    }

    const chunks = splitOversizedToken(ctx, word, maxWidth)
    lines.push(...chunks.slice(0, -1))
    current = chunks.at(-1) ?? ''
  }

  if (current) lines.push(current)
  return lines
}

export function wrapText(ctx, text, maxWidth) {
  const normalized = String(text ?? '')
  if (normalized === '') return []
  return normalized.split('\n').flatMap(paragraph => wrapParagraph(ctx, paragraph, maxWidth))
}

export function renderComposition(ctx, state, image, dimensions) {
  const { width, height } = dimensions
  ctx.save()
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#24272e'
  ctx.fillRect(0, 0, width, height)

  if (image) {
    const sourceWidth = image.naturalWidth || image.videoWidth || image.width
    const sourceHeight = image.naturalHeight || image.videoHeight || image.height
    if (sourceWidth > 0 && sourceHeight > 0) {
      const rect = computeCoverRect(sourceWidth, sourceHeight, width, height)
      ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height)
    }
  } else {
    const gradient = ctx.createLinearGradient?.(0, 0, width, height)
    if (gradient?.addColorStop) {
      gradient.addColorStop(0, '#22252c')
      gradient.addColorStop(1, '#3f4554')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
  }

  const content = String(state?.text?.content ?? '')
  if (content) {
    const scale = width / 1080
    const fontSize = Math.max(1, Number(state.text.size) * scale)
    const x = (Number(state.text.x) / 100) * width
    const y = (Number(state.text.y) / 100) * height
    const maxWidth = width * 0.84
    const lineHeight = fontSize * 1.25

    ctx.font = `800 ${fontSize}px Inter, Pretendard, "Noto Sans KR", system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = state.text.color || '#ffffff'
    ctx.lineJoin = 'round'

    const lines = wrapText(ctx, content, maxWidth)
    const blockHeight = lines.length * lineHeight
    const startY = y - blockHeight / 2

    lines.forEach((line, index) => {
      ctx.fillText(line, x, startY + index * lineHeight, maxWidth)
    })
  }

  ctx.restore()
}

export function renderStudioCanvas(canvas, state, image) {
  const dimensions = getAspectDimensions(state.aspect)
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context를 사용할 수 없습니다.')
  renderComposition(ctx, state, image, dimensions)
  return dimensions
}
