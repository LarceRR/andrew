import { useEffect, useRef } from 'react'

const GLITCH_DURATION_MS = 430
const BURSTS = [
  { start: 0, end: 44, intensity: 0.8 },
  { start: 88, end: 137, intensity: 1.05 },
  { start: 185, end: 245, intensity: 1.3 },
  { start: 290, end: 392, intensity: 1.65 },
]

function wrapWords(context, text, maxWidth) {
  const words = text.trim().split(/\s+/u).filter(Boolean)
  const lines = []
  let line = ''

  words.forEach((word) => {
    const candidate = line ? line + ' ' + word : word

    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  })

  if (line) lines.push(line)
  return lines
}

function createTextSnapshot(sourceCanvas, frame, renderScale) {
  const context = sourceCanvas.getContext('2d')
  if (!context) return false

  const message = frame.querySelector('.stage-four__message')
  if (!message) return false

  const bounds = frame.getBoundingClientRect()
  const style = window.getComputedStyle(message)
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  const fontSize = Number.parseFloat(style.fontSize) || 32
  const parsedLineHeight = Number.parseFloat(style.lineHeight)
  const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.12
  const fontWeight = style.fontWeight || '900'
  const fontFamily = style.fontFamily || 'Impact, Arial, sans-serif'

  context.setTransform(renderScale, 0, 0, renderScale, 0, 0)
  context.clearRect(0, 0, width, height)
  context.font = fontWeight + ' ' + fontSize + 'px ' + fontFamily
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = style.color || '#f7f7fb'

  if ('letterSpacing' in context) {
    context.letterSpacing = style.letterSpacing || '0px'
  }

  const lines = wrapWords(context, sourceCanvas.dataset.glitchText || '', Math.max(1, width - 8))
  const contentHeight = lines.length * lineHeight
  const firstBaseline = Math.max(fontSize, (height - contentHeight) / 2 + fontSize * 0.88)

  lines.forEach((line, index) => {
    context.fillText(line, width / 2, firstBaseline + index * lineHeight, width - 4)
  })

  return true
}

function createTintedLayer(sourceCanvas, color) {
  const canvas = document.createElement('canvas')
  canvas.width = sourceCanvas.width
  canvas.height = sourceCanvas.height
  const context = canvas.getContext('2d')
  if (!context) return null

  context.drawImage(sourceCanvas, 0, 0)
  context.globalCompositeOperation = 'source-in'
  context.fillStyle = color
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.globalCompositeOperation = 'source-over'
  return canvas
}

function drawGlitchFrame(context, sourceCanvas, channels, elapsed) {
  const width = sourceCanvas.width
  const height = sourceCanvas.height

  context.clearRect(0, 0, width, height)
  context.drawImage(sourceCanvas, 0, 0)

  const burst = BURSTS.find(({ start, end }) => elapsed >= start && elapsed < end)
  if (!burst) return

  const stripeCount = 4 + Math.round(Math.random() * 7)

  for (let index = 0; index < stripeCount; index += 1) {
    const stripeY = Math.floor(Math.random() * height)
    const stripeHeight = Math.max(
      1,
      Math.min(height - stripeY, Math.round((1 + Math.random() * 6) * burst.intensity)),
    )
    const shift = (Math.random() - 0.5) * 42 * burst.intensity

    context.save()
    context.beginPath()
    context.rect(0, stripeY, width, stripeHeight)
    context.clip()

    context.globalCompositeOperation = 'source-over'
    if (Math.random() > 0.36) {
      context.drawImage(sourceCanvas, shift, 0)
    }

    if (channels.length === 3) {
      context.globalCompositeOperation = 'screen'
      context.drawImage(channels[0], -shift * 1.35, 0)
      context.drawImage(channels[1], shift * 0.12, 0)
      context.drawImage(channels[2], shift * 1.55, 0)
    }

    context.globalCompositeOperation = 'source-over'
    if (Math.random() > 0.78) {
      context.fillStyle = Math.random() > 0.5
        ? 'rgb(255 255 255 / 72%)'
        : 'rgb(0 0 0 / 85%)'
      context.fillRect(0, stripeY, width, 1)
    }

    context.restore()
  }
}

export default function TextGlitchCanvas({ text, frameRef, onComplete }) {
  const canvasRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    const frame = frameRef.current
    const context = canvas?.getContext('2d')

    let disposed = false
    let animationFrame = 0
    let finishTimeout = 0

    const finish = () => {
      if (disposed) return
      onCompleteRef.current?.()
    }

    if (!canvas || !frame || !context) {
      finishTimeout = window.setTimeout(finish, GLITCH_DURATION_MS)
      return () => {
        disposed = true
        window.clearTimeout(finishTimeout)
      }
    }

    const bounds = frame.getBoundingClientRect()
    const renderScale = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(bounds.width * renderScale))
    const height = Math.max(1, Math.round(bounds.height * renderScale))

    canvas.width = width
    canvas.height = height

    const sourceCanvas = document.createElement('canvas')
    sourceCanvas.width = width
    sourceCanvas.height = height
    sourceCanvas.dataset.glitchText = text

    const drawn = createTextSnapshot(sourceCanvas, frame, renderScale)
    if (!drawn) {
      finishTimeout = window.setTimeout(finish, GLITCH_DURATION_MS)
      return () => {
        disposed = true
        window.clearTimeout(finishTimeout)
      }
    }

    const channels = [
      createTintedLayer(sourceCanvas, '#ff2638'),
      createTintedLayer(sourceCanvas, '#5aff9a'),
      createTintedLayer(sourceCanvas, '#4b76ff'),
    ].filter(Boolean)

    const startedAt = performance.now()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishTimeout = window.setTimeout(finish, 60)
      return () => {
        disposed = true
        window.clearTimeout(finishTimeout)
      }
    }

    const render = (timestamp) => {
      if (disposed) return
      const elapsed = timestamp - startedAt

      if (elapsed >= GLITCH_DURATION_MS) {
        finish()
        return
      }

      drawGlitchFrame(context, sourceCanvas, channels, elapsed)
      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(finishTimeout)
    }
  }, [text, frameRef])

  return (
    <canvas
      ref={canvasRef}
      className="stage-four__text-glitch-canvas"
      aria-hidden="true"
    />
  )
}
