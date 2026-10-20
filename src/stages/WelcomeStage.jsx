import { useEffect, useRef, useState } from 'react'
import './WelcomeStage.css'

const BACKGROUND = '#000000'
const PINK = '#F4A6C1'
const HEART_COLORS = ['#FF4D8D', '#FF6F9F', '#F783AC', '#FF9DBC', '#FFC0D4', PINK]
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif'

const DISSOLVE_START = 0.22
const DISSOLVE_DURATION = 1.35
const PARTICLE_DURATION = 1.65
const HERO_START = 0.95
const HERO_MOVE_DURATION = 0.48
const HERO_GROW_DURATION = 2.15
const TOTAL_DURATION = HERO_START + HERO_GROW_DURATION
const MAX_PARTICLES = 420

const random = (min, max) => min + Math.random() * (max - min)
const clamp = (value) => Math.max(0, Math.min(1, value))
const lerp = (start, end, progress) => start + (end - start) * progress

function smoothstep(value) {
  const progress = clamp(value)
  return progress * progress * (3 - 2 * progress)
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value), 3)
}

function easeInCubic(value) {
  return Math.pow(clamp(value), 3)
}

function easeInOutCubic(value) {
  const progress = clamp(value)
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

function createLayout(context, width, height) {
  const availableWidth = Math.max(1, width - 36)
  let firstSize = Math.min(56, Math.max(34, width * 0.12))
  let secondSize = Math.min(48, Math.max(29, width * 0.087))
  let prefixWidth = 0
  let wordWidth = 0
  let emojiWidth = 0
  const emojiGapFor = (size) => size * 0.16

  const measureSecondLine = (size) => {
    context.font = '500 ' + size + 'px ' + FONT_FAMILY
    prefixWidth = context.measureText('мой любимый ').width
    wordWidth = context.measureText('жопик').width
    context.font = '500 ' + size + 'px ' + EMOJI_FONT
    emojiWidth = context.measureText('🍑').width
    return prefixWidth + wordWidth + emojiGapFor(size) + emojiWidth
  }

  while (secondSize > 23 && measureSecondLine(secondSize) > availableWidth) {
    secondSize -= 1
  }
  measureSecondLine(secondSize)

  while (firstSize > 28) {
    context.font = '500 ' + firstSize + 'px ' + FONT_FAMILY
    if (context.measureText('Привет!').width <= availableWidth) break
    firstSize -= 1
  }

  const lineGap = Math.max(4, secondSize * 0.12)
  const blockHeight = firstSize + lineGap + secondSize
  const blockTop = (height - blockHeight) / 2

  return {
    firstSize,
    secondSize,
    firstY: blockTop + firstSize / 2,
    secondY: blockTop + firstSize + lineGap + secondSize / 2,
    prefixWidth,
    wordWidth,
    emojiWidth,
    emojiGap: emojiGapFor(secondSize),
  }
}

function drawGreeting(context, width, layout, alpha = 1) {
  context.save()
  context.globalAlpha = alpha
  context.textBaseline = 'middle'
  context.textAlign = 'center'
  context.fillStyle = '#FFFFFF'
  context.font = '600 ' + layout.firstSize + 'px ' + FONT_FAMILY
  context.fillText('Привет!', width / 2, layout.firstY)

  context.font = '500 ' + layout.secondSize + 'px ' + FONT_FAMILY
  const totalWidth = layout.prefixWidth + layout.wordWidth + layout.emojiGap + layout.emojiWidth
  const startX = (width - totalWidth) / 2

  context.textAlign = 'left'
  context.fillStyle = '#FFFFFF'
  context.fillText('мой любимый ', startX, layout.secondY)
  context.fillStyle = '#FF729F'
  context.fillText('жопик', startX + layout.prefixWidth, layout.secondY)
  context.font = '500 ' + layout.secondSize + 'px ' + EMOJI_FONT
  context.fillText(
    '🍑',
    startX + layout.prefixWidth + layout.wordWidth + layout.emojiGap,
    layout.secondY + 1,
  )
  context.restore()
}

function createTextSamples(width, height, pixelRatio, layout) {
  const scratch = document.createElement('canvas')
  scratch.width = Math.max(1, Math.round(width * pixelRatio))
  scratch.height = Math.max(1, Math.round(height * pixelRatio))

  const scratchContext = scratch.getContext('2d', { willReadFrequently: true })
  if (!scratchContext) return []

  scratchContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  drawGreeting(scratchContext, width, layout, 1)

  let image
  try {
    image = scratchContext.getImageData(0, 0, scratch.width, scratch.height)
  } catch {
    return []
  }

  const candidates = []
  const step = Math.max(2, Math.round(3.2 * pixelRatio))

  for (let y = Math.floor(step / 2); y < image.height; y += step) {
    for (let x = Math.floor(step / 2); x < image.width; x += step) {
      const alpha = image.data[(y * image.width + x) * 4 + 3]
      if (alpha > 40) {
        candidates.push({
          x: x / pixelRatio,
          y: y / pixelRatio,
        })
      }
    }
  }

  const count = Math.min(MAX_PARTICLES, candidates.length)
  for (let index = 0; index < count; index += 1) {
    const swapIndex = index + Math.floor(Math.random() * (candidates.length - index))
    const current = candidates[index]
    candidates[index] = candidates[swapIndex]
    candidates[swapIndex] = current
  }

  return candidates.slice(0, count).map((point) => {
    const angle = random(0, Math.PI * 2)
    const distance = random(Math.min(width, height) * 0.12, Math.max(width, height) * 0.58)

    return {
      startX: point.x,
      startY: point.y,
      driftX: Math.cos(angle) * distance,
      driftY: Math.sin(angle) * distance,
      size: random(6, 14),
      color: HEART_COLORS[Math.floor(random(0, HEART_COLORS.length))],
      delay: random(0, 0.52),
      rotation: random(-0.14, 0.14),
      spin: random(-0.9, 0.9),
    }
  })
}

function getParticlePosition(particle, elapsed) {
  const startAt = DISSOLVE_START + particle.delay
  const progress = clamp((elapsed - startAt) / PARTICLE_DURATION)
  const movement = easeOutCubic(progress)

  return {
    x: particle.startX + particle.driftX * movement,
    y: particle.startY + particle.driftY * movement,
    progress,
    rotation: particle.rotation + particle.spin * movement,
  }
}

function drawHeart(context, x, y, size, color, alpha = 1, rotation = 0) {
  const heartWidth = size * 1.1
  const heartHeight = size * 1.05

  context.save()
  context.globalAlpha = alpha
  context.translate(x, y)
  context.rotate(rotation)
  context.fillStyle = color
  context.beginPath()
  context.moveTo(0, heartHeight * 0.44)
  context.bezierCurveTo(
    -heartWidth * 0.17,
    heartHeight * 0.27,
    -heartWidth * 0.52,
    heartHeight * 0.02,
    -heartWidth * 0.44,
    -heartHeight * 0.22,
  )
  context.bezierCurveTo(
    -heartWidth * 0.37,
    -heartHeight * 0.47,
    -heartWidth * 0.09,
    -heartHeight * 0.5,
    0,
    -heartHeight * 0.25,
  )
  context.bezierCurveTo(
    heartWidth * 0.09,
    -heartHeight * 0.5,
    heartWidth * 0.37,
    -heartHeight * 0.47,
    heartWidth * 0.44,
    -heartHeight * 0.22,
  )
  context.bezierCurveTo(
    heartWidth * 0.52,
    heartHeight * 0.02,
    heartWidth * 0.17,
    heartHeight * 0.27,
    0,
    heartHeight * 0.44,
  )
  context.closePath()
  context.fill()
  context.restore()
}

export default function WelcomeStage() {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPink, setIsPink] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return undefined

    let width = 0
    let height = 0
    let pixelRatio = 1
    let layout = null
    let animationFrame = 0
    let startedAt = 0
    let phase = 'idle'

    const drawBackground = (color) => {
      context.globalAlpha = 1
      context.fillStyle = color
      context.fillRect(0, 0, width, height)
    }

    const drawIdle = () => {
      drawBackground(BACKGROUND)
      drawGreeting(context, width, layout, 1)
    }

    const resize = () => {
      const previousWidth = width
      const previousHeight = height
      const rect = canvas.getBoundingClientRect()
      const nextWidth = Math.max(1, rect.width)
      const nextHeight = Math.max(1, rect.height)
      const nextPixelRatio = Math.min(window.devicePixelRatio || 1, 2)

      width = nextWidth
      height = nextHeight
      pixelRatio = nextPixelRatio

      if (phase === 'animating' && previousWidth > 0 && previousHeight > 0) {
        const scaleX = width / previousWidth
        const scaleY = height / previousHeight

        particlesRef.current.forEach((particle) => {
          particle.startX *= scaleX
          particle.startY *= scaleY
          particle.driftX *= scaleX
          particle.driftY *= scaleY
        })
      }

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      layout = createLayout(context, width, height)

      if (phase === 'idle') drawIdle()
      if (phase === 'done') drawBackground(PINK)
    }

    const begin = () => {
      if (phase !== 'idle') return

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        phase = 'done'
        drawBackground(PINK)
        setIsPink(true)
        return
      }

      phase = 'animating'
      startedAt = performance.now()
      particlesRef.current = createTextSamples(width, height, pixelRatio, layout)
      setIsAnimating(true)
      animationFrame = window.requestAnimationFrame(animate)
    }

    const animate = (now) => {
      if (phase !== 'animating') return

      const elapsed = Math.max(0, (now - startedAt) / 1000)
      drawBackground(BACKGROUND)

      if (elapsed >= TOTAL_DURATION) {
        drawBackground(PINK)
        phase = 'done'
        particlesRef.current = []
        setIsPink(true)
        setIsAnimating(false)
        return
      }

      const textDissolve = smoothstep((elapsed - DISSOLVE_START) / DISSOLVE_DURATION)
      drawGreeting(context, width, layout, 1 - textDissolve)

      const particles = particlesRef.current
      const heroIndex = particles.reduce((bestIndex, particle, index) => {
        const best = particles[bestIndex]
        const distance = Math.hypot(particle.startX - width / 2, particle.startY - height / 2)
        const bestDistance = Math.hypot(best.startX - width / 2, best.startY - height / 2)
        return distance < bestDistance ? index : bestIndex
      }, 0)

      const hero = particles[heroIndex]
      const heroHasStarted = elapsed >= HERO_START

      particles.forEach((particle, index) => {
        if (heroHasStarted && index === heroIndex) return

        const startAt = DISSOLVE_START + particle.delay
        if (elapsed < startAt) return

        const position = getParticlePosition(particle, elapsed)
        const fadeIn = clamp(position.progress / 0.18)
        const fadeOut = 1 - smoothstep((position.progress - 0.55) / 0.45)
        const alpha = fadeIn * fadeOut

        if (alpha <= 0.005) return

        drawHeart(
          context,
          position.x,
          position.y,
          particle.size,
          particle.color,
          alpha,
          position.rotation,
        )
      })

      if (hero) {
        if (!heroHasStarted) {
          const heroPosition = getParticlePosition(hero, elapsed)
          const fadeIn = clamp(heroPosition.progress / 0.18)
          const fadeOut = 1 - smoothstep((heroPosition.progress - 0.55) / 0.45)
          const alpha = fadeIn * fadeOut

          if (alpha > 0.005) {
            drawHeart(
              context,
              heroPosition.x,
              heroPosition.y,
              hero.size,
              hero.color,
              alpha,
              heroPosition.rotation,
            )
          }
        } else {
          const heroElapsed = elapsed - HERO_START
          const origin = getParticlePosition(hero, HERO_START)
          const moveProgress = easeInOutCubic(heroElapsed / HERO_MOVE_DURATION)
          const x = lerp(origin.x, width / 2, moveProgress)
          const y = lerp(origin.y, height / 2, moveProgress)
          const growthProgress = easeInCubic(heroElapsed / HERO_GROW_DURATION)
          const coverSize = Math.max(width, height) * 5.5
          const size = lerp(hero.size, coverSize, growthProgress)

          drawHeart(context, x, y, size, PINK, 1, 0)
        }
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        begin()
      }
    }

    canvas.addEventListener('click', begin)
    canvas.addEventListener('keydown', onKeyDown)

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    return () => {
      observer.disconnect()
      canvas.removeEventListener('click', begin)
      canvas.removeEventListener('keydown', onKeyDown)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <main className={'welcome-stage' + (isPink ? ' welcome-stage--pink' : '')}>
      <canvas
        ref={canvasRef}
        className="welcome-stage__canvas"
        role="button"
        tabIndex={0}
        aria-label={isPink ? 'Приветствие завершено' : isAnimating ? 'Анимация перехода' : 'Открыть приветствие'}
      />
    </main>
  )
}
