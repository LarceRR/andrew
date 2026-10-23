import { useEffect, useRef } from 'react'
import './GlitchTransitionOverlay.css'

const GLITCH_ACTIVE_MS = 570
const BLACK_HOLD_MS = 190
const BURSTS = [
  { start: 0, end: 54, intensity: 0.9 },
  { start: 104, end: 151, intensity: 1.1 },
  { start: 207, end: 263, intensity: 1.25 },
  { start: 330, end: 405, intensity: 1.5 },
  { start: 455, end: 535, intensity: 1.9 },
]

function getRenderScale(width, height) {
  const deviceScale = window.devicePixelRatio || 1
  const pixelLimit = 1_650_000
  const pixelScale = Math.sqrt(pixelLimit / Math.max(1, width * height))
  return Math.max(0.5, Math.min(deviceScale, 1.5, pixelScale))
}

function drawImageCover(context, image, width, height) {
  if (!image || !image.naturalWidth || !image.naturalHeight) return

  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
}

function wrapText(context, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean)
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

function drawSceneSnapshot(canvas, stage, renderScale, cssWidth, cssHeight) {
  const context = canvas.getContext('2d')
  if (!context) return

  const width = canvas.width
  const height = canvas.height
  const stageStyle = window.getComputedStyle(stage)

  context.fillStyle = stageStyle.backgroundColor || '#050505'
  context.fillRect(0, 0, width, height)

  // Rebuild the current slideshow frame at canvas resolution so the effect
  // uses the actual photo visible behind the last caption.
  const photos = Array.from(stage.querySelectorAll('.stage-three__photo'))
    .sort((first, second) => (
      Number(first.style.zIndex || 0) - Number(second.style.zIndex || 0)
    ))

  photos.forEach((photo) => {
    const opacity = Number.parseFloat(window.getComputedStyle(photo).opacity)
    if (!Number.isFinite(opacity) || opacity <= 0.01) return

    context.save()
    context.globalAlpha = opacity
    drawImageCover(context, photo, width, height)
    context.restore()
  })

  const darkOverlayHeight = Math.min(500, Math.max(260, cssHeight * 0.52)) * renderScale
  const gradient = context.createLinearGradient(0, height - darkOverlayHeight, 0, height)
  gradient.addColorStop(0, 'rgb(0 0 0 / 0%)')
  gradient.addColorStop(0.34, 'rgb(0 0 0 / 30%)')
  gradient.addColorStop(0.68, 'rgb(0 0 0 / 66%)')
  gradient.addColorStop(1, 'rgb(0 0 0 / 88%)')
  context.fillStyle = gradient
  context.fillRect(0, height - darkOverlayHeight, width, darkOverlayHeight)

  const message = stage.querySelector('.stage-three__message')
  if (!message) return

  const messageStyle = window.getComputedStyle(message)
  if (messageStyle.visibility === 'hidden') return

  const opacity = Number.parseFloat(messageStyle.opacity)
  if (!Number.isFinite(opacity) || opacity <= 0.01) return

  const bounds = message.getBoundingClientRect()
  const fontSize = (Number.parseFloat(messageStyle.fontSize) || 32) * renderScale
  const lineHeight = (Number.parseFloat(messageStyle.lineHeight) || fontSize / renderScale * 1.12) * renderScale
  const x = bounds.left * renderScale
  const y = bounds.top * renderScale
  const maxTextWidth = Math.max(1, bounds.width * renderScale)
  const text = (message.innerText || message.textContent || '').replace(/\s+/g, ' ').trim()

  context.save()
  context.globalAlpha = opacity
  context.fillStyle = messageStyle.color || '#ffffff'
  context.font = `${messageStyle.fontWeight || 900} ${fontSize}px ${messageStyle.fontFamily || 'Impact, Arial, sans-serif'}`
  context.textBaseline = 'alphabetic'
  context.textAlign = messageStyle.textAlign || 'left'
  if ('letterSpacing' in context) {
    const letterSpacing = Number.parseFloat(messageStyle.letterSpacing)
    if (Number.isFinite(letterSpacing)) context.letterSpacing = (letterSpacing * renderScale) + 'px'
  }
  context.shadowColor = 'rgb(0 0 0 / 50%)'
  context.shadowBlur = fontSize * 0.15
  context.shadowOffsetY = 2 * renderScale

  const lines = wrapText(context, text, maxTextWidth)
  lines.forEach((line, index) => {
    context.fillText(line, x, y + fontSize * 0.88 + index * lineHeight, maxTextWidth)
  })
  context.restore()
}

function createRgbChannels(sourceCanvas) {
  try {
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
    const image = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
    const channels = ['red', 'green', 'blue'].map(() => {
      const canvas = document.createElement('canvas')
      canvas.width = sourceCanvas.width
      canvas.height = sourceCanvas.height
      return canvas
    })
    const channelData = channels.map((canvas) => (
      canvas.getContext('2d').createImageData(sourceCanvas.width, sourceCanvas.height)
    ))

    const source = image.data
    const red = channelData[0].data
    const green = channelData[1].data
    const blue = channelData[2].data

    for (let index = 0; index < source.length; index += 4) {
      red[index] = source[index]
      red[index + 3] = source[index + 3]
      green[index + 1] = source[index + 1]
      green[index + 3] = source[index + 3]
      blue[index + 2] = source[index + 2]
      blue[index + 3] = source[index + 3]
    }

    channels.forEach((canvas, index) => {
      canvas.getContext('2d').putImageData(channelData[index], 0, 0)
    })

    return channels
  } catch {
    // The main glitch still works as horizontal tearing if channel extraction
    // is unavailable in the current browser.
    return []
  }
}

function paintBlack(context, width, height) {
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.globalAlpha = 1
  context.globalCompositeOperation = 'source-over'
  context.fillStyle = '#000000'
  context.fillRect(0, 0, width, height)
}

export default function GlitchTransitionOverlay({ onComplete }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const stage = document.querySelector('.stage-three')
    if (!canvas || !stage) {
      const fallbackTimeout = window.setTimeout(onComplete, GLITCH_ACTIVE_MS + BLACK_HOLD_MS)
      return () => window.clearTimeout(fallbackTimeout)
    }

    const cssWidth = Math.max(1, window.innerWidth)
    const cssHeight = Math.max(1, window.innerHeight)
    const renderScale = getRenderScale(cssWidth, cssHeight)

    canvas.width = Math.max(1, Math.round(cssWidth * renderScale))
    canvas.height = Math.max(1, Math.round(cssHeight * renderScale))

    const context = canvas.getContext('2d')
    if (!context) {
      const fallbackTimeout = window.setTimeout(onComplete, GLITCH_ACTIVE_MS + BLACK_HOLD_MS)
      return () => window.clearTimeout(fallbackTimeout)
    }

    const sceneCanvas = document.createElement('canvas')
    sceneCanvas.width = canvas.width
    sceneCanvas.height = canvas.height

    try {
      drawSceneSnapshot(sceneCanvas, stage, renderScale, cssWidth, cssHeight)
    } catch {
      const sceneContext = sceneCanvas.getContext('2d')
      if (sceneContext) {
        sceneContext.fillStyle = '#050505'
        sceneContext.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height)
      }
    }

    // Show the captured frame immediately; the first glitch burst starts
    // from a stable image rather than from a blank canvas.
    context.drawImage(sceneCanvas, 0, 0)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let disposed = false
    let completed = false
    let animationFrame = 0
    let blackTimeout = 0

    const finish = () => {
      if (disposed || completed) return
      completed = true
      onComplete()
    }

    if (prefersReducedMotion) {
      paintBlack(context, canvas.width, canvas.height)
      blackTimeout = window.setTimeout(finish, 80)
      return () => {
        disposed = true
        window.clearTimeout(blackTimeout)
      }
    }

    const channels = createRgbChannels(sceneCanvas)
    const startedAt = performance.now()

    const drawGlitchFrame = (timestamp) => {
      if (disposed || completed) return

      const elapsed = timestamp - startedAt
      if (elapsed >= GLITCH_ACTIVE_MS) {
        paintBlack(context, canvas.width, canvas.height)
        blackTimeout = window.setTimeout(finish, BLACK_HOLD_MS)
        return
      }

      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
      context.drawImage(sceneCanvas, 0, 0)

      const burst = BURSTS.find(({ start, end }) => elapsed >= start && elapsed < end)
      if (burst) {
        const stripeCount = Math.round(5 + Math.random() * 7)
        for (let index = 0; index < stripeCount; index += 1) {
          const y = Math.floor(Math.random() * canvas.height)
          const stripeHeight = Math.max(
            1,
            Math.min(
              canvas.height - y,
              Math.round((2 + Math.random() * 15) * renderScale * burst.intensity),
            ),
          )
          const shift = (Math.random() - 0.5) * 78 * renderScale * burst.intensity

          context.save()
          context.beginPath()
          context.rect(0, y, canvas.width, stripeHeight)
          context.clip()

          // First tear the scene itself, then offset its isolated RGB channels.
          if (Math.random() > 0.22) {
            context.globalCompositeOperation = 'source-over'
            context.drawImage(sceneCanvas, shift, 0)
          }

          if (channels.length === 3) {
            context.globalCompositeOperation = 'screen'
            context.globalAlpha = 0.92
            context.drawImage(channels[0], -shift * 1.15, 0)
            context.drawImage(channels[1], shift * 0.12, 0)
            context.drawImage(channels[2], shift * 1.3, 0)
          }

          context.globalCompositeOperation = 'source-over'
          context.globalAlpha = 1

          if (Math.random() > 0.76) {
            context.fillStyle = Math.random() > 0.5
              ? 'rgb(255 255 255 / 62%)'
              : 'rgb(0 0 0 / 72%)'
            context.fillRect(0, y, canvas.width, Math.max(1, renderScale))
          }
          context.restore()
        }

        if (Math.random() > 0.72) {
          context.fillStyle = 'rgb(255 255 255 / 24%)'
          context.fillRect(0, Math.random() * canvas.height, canvas.width, Math.max(1, renderScale))
        }
      }

      animationFrame = window.requestAnimationFrame(drawGlitchFrame)
    }

    animationFrame = window.requestAnimationFrame(drawGlitchFrame)

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(blackTimeout)
    }
  }, [onComplete])

  return (
    <div className="stage-four-glitch-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="stage-four-glitch-overlay__canvas" />
    </div>
  )
}
