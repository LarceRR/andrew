import { useEffect, useRef } from 'react'

const GLITCH_ACTIVE_MS = 520
const BLACK_HOLD_MS = 90
const BURSTS = [
  { start: 0, end: 54, intensity: 0.9 },
  { start: 96, end: 153, intensity: 1.1 },
  { start: 190, end: 267, intensity: 1.3 },
  { start: 315, end: 405, intensity: 1.6 },
  { start: 432, end: 510, intensity: 1.9 },
]

function getRenderScale(width, height) {
  const deviceScale = window.devicePixelRatio || 1
  const pixelLimit = 1_450_000
  const pixelScale = Math.sqrt(pixelLimit / Math.max(1, width * height))
  return Math.max(0.5, Math.min(deviceScale, 1.5, pixelScale))
}

function drawImageCover(context, image, width, height) {
  if (!image?.naturalWidth || !image.naturalHeight) return

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
    // Horizontal tearing still works if RGB extraction is unavailable.
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

export default function PhotoGlitchOverlay({ source, onComplete }) {
  const canvasRef = useRef(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !source) {
      const fallbackTimeout = window.setTimeout(() => onCompleteRef.current?.(), 40)
      return () => window.clearTimeout(fallbackTimeout)
    }

    let disposed = false
    let completed = false
    let started = false
    let animationFrame = 0
    let finishTimeout = 0

    const finish = () => {
      if (disposed || completed) return
      completed = true
      onCompleteRef.current?.()
    }

    const image = new Image()
    image.decoding = 'async'

    const start = () => {
      if (disposed || started) return
      started = true

      const context = canvas.getContext('2d')
      if (!context) {
        finishTimeout = window.setTimeout(finish, 40)
        return
      }

      const cssWidth = Math.max(1, window.innerWidth)
      const cssHeight = Math.max(1, window.innerHeight)
      const renderScale = getRenderScale(cssWidth, cssHeight)
      canvas.width = Math.max(1, Math.round(cssWidth * renderScale))
      canvas.height = Math.max(1, Math.round(cssHeight * renderScale))

      const snapshot = document.createElement('canvas')
      snapshot.width = canvas.width
      snapshot.height = canvas.height
      const snapshotContext = snapshot.getContext('2d')
      if (!snapshotContext) {
        finishTimeout = window.setTimeout(finish, 40)
        return
      }

      drawImageCover(snapshotContext, image, snapshot.width, snapshot.height)
      context.drawImage(snapshot, 0, 0)

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        paintBlack(context, canvas.width, canvas.height)
        finishTimeout = window.setTimeout(finish, 40)
        return
      }

      const channels = createRgbChannels(snapshot)
      const startedAt = performance.now()

      const render = (timestamp) => {
        if (disposed || completed) return

        const elapsed = timestamp - startedAt
        if (elapsed >= GLITCH_ACTIVE_MS) {
          paintBlack(context, canvas.width, canvas.height)
          finishTimeout = window.setTimeout(finish, BLACK_HOLD_MS)
          return
        }

        context.globalAlpha = 1
        context.globalCompositeOperation = 'source-over'
        context.drawImage(snapshot, 0, 0)

        const burst = BURSTS.find(({ start: from, end }) => elapsed >= from && elapsed < end)
        if (burst) {
          const stripeCount = Math.round(5 + Math.random() * 7)

          for (let index = 0; index < stripeCount; index += 1) {
            const y = Math.floor(Math.random() * canvas.height)
            const stripeHeight = Math.max(
              1,
              Math.min(
                canvas.height - y,
                Math.round((2 + Math.random() * 13) * renderScale * burst.intensity),
              ),
            )
            const shift = (Math.random() - 0.5) * 78 * renderScale * burst.intensity

            context.save()
            context.beginPath()
            context.rect(0, y, canvas.width, stripeHeight)
            context.clip()

            if (Math.random() > 0.22) {
              context.drawImage(snapshot, shift, 0)
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
            context.fillRect(
              0,
              Math.random() * canvas.height,
              canvas.width,
              Math.max(1, renderScale),
            )
          }
        }

        animationFrame = window.requestAnimationFrame(render)
      }

      animationFrame = window.requestAnimationFrame(render)
    }

    const handleLoad = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode()
      } catch {
        // A loaded image may still be drawable when decode() rejects.
      }
      start()
    }

    image.onload = handleLoad
    image.onerror = () => {
      if (disposed || started) return
      started = true
      finishTimeout = window.setTimeout(finish, 40)
    }
    image.src = source
    if (image.complete && image.naturalWidth > 0) void handleLoad()

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      window.clearTimeout(finishTimeout)
      image.onload = null
      image.onerror = null
    }
  }, [source])

  return (
    <canvas
      ref={canvasRef}
      className="stage-three__photo-glitch"
      aria-hidden="true"
    />
  )
}
