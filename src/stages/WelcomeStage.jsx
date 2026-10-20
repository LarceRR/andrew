import { useEffect, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import './WelcomeStage.css'

const BACKGROUND = '#000000'
const PINK = '#F4A6C1'
const HEART_COLORS = ['#FF4D8D', '#FF6F9F', '#F783AC', '#FF9DBC', '#FFC0D4', PINK]
const INTRO_FIRST_DURATION = 0.72
const INTRO_SECOND_START = 0.46
const INTRO_SECOND_DURATION = 0.78
const INTRO_TOTAL_DURATION = INTRO_SECOND_START + INTRO_SECOND_DURATION + 0.12
const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'
const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", sans-serif'

const DISSOLVE_START = 0.18
const DISSOLVE_DURATION = 0.86
const FORMATION_DURATION = 0.54
const SILHOUETTE_HOLD = 0.12
const SCATTER_START = DISSOLVE_START + DISSOLVE_DURATION + SILHOUETTE_HOLD
const PARTICLE_DURATION = 1.65
const HERO_START = SCATTER_START
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
  let firstSize = Math.min(70, Math.max(40, width * 0.15))
  let secondSize = Math.min(60, Math.max(32, width * 0.13))
  let prefixWidth = 0
  let wordWidth = 0
  let emojiWidth = 0
  const emojiGapFor = (size) => size * 0.16

  const measureSecondLine = (size) => {
    context.font = '700 ' + size + 'px ' + FONT_FAMILY
    prefixWidth = context.measureText('мой любимый ').width
    context.font = '800 ' + size + 'px ' + FONT_FAMILY
    wordWidth = context.measureText('жопик').width
    context.font = '500 ' + size + 'px ' + EMOJI_FONT
    emojiWidth = context.measureText('🍑').width
    return prefixWidth + wordWidth + emojiGapFor(size) + emojiWidth
  }

  while (secondSize > 22 && measureSecondLine(secondSize) > availableWidth) {
    secondSize -= 1
  }

  const measuredSecondLine = measureSecondLine(secondSize)
  if (measuredSecondLine > availableWidth) {
    secondSize *= availableWidth / measuredSecondLine
    measureSecondLine(secondSize)
  }

  while (firstSize > 28) {
    context.font = '800 ' + firstSize + 'px ' + FONT_FAMILY
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

function drawGreeting(
  context,
  width,
  layout,
  alpha = 1,
  firstLineOpacity = 1,
  secondLineOpacity = 1,
  firstLineOffsetY = 0,
  secondLineOffsetY = 0,
) {
  context.save()
  context.textBaseline = 'middle'
  context.textAlign = 'center'
  context.fillStyle = '#FFFFFF'
  context.globalAlpha = alpha * firstLineOpacity
  context.font = '800 ' + layout.firstSize + 'px ' + FONT_FAMILY
  context.fillText('Привет!', width / 2, layout.firstY + firstLineOffsetY)

  const totalWidth = layout.prefixWidth + layout.wordWidth + layout.emojiGap + layout.emojiWidth
  const startX = (width - totalWidth) / 2

  context.globalAlpha = alpha * secondLineOpacity
  context.textAlign = 'left'
  context.font = '700 ' + layout.secondSize + 'px ' + FONT_FAMILY
  context.fillStyle = '#FFFFFF'
  context.fillText('мой любимый ', startX, layout.secondY + secondLineOffsetY)
  context.font = '800 ' + layout.secondSize + 'px ' + FONT_FAMILY
  context.fillStyle = '#FF729F'
  context.fillText('жопик', startX + layout.prefixWidth, layout.secondY + secondLineOffsetY)
  context.font = '500 ' + layout.secondSize + 'px ' + EMOJI_FONT
  context.fillText(
    '🍑',
    startX + layout.prefixWidth + layout.wordWidth + layout.emojiGap,
    layout.secondY + secondLineOffsetY + 1,
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
      delay: random(0, 0.22),
      rotation: random(-0.14, 0.14),
      spin: random(-0.9, 0.9),
    }
  })
}

function getParticlePosition(particle, elapsed) {
  const progress = clamp((elapsed - SCATTER_START) / PARTICLE_DURATION)
  const movement = easeOutCubic(progress)

  return {
    x: particle.startX + particle.driftX * movement,
    y: particle.startY + particle.driftY * movement,
    progress,
    rotation: particle.rotation + particle.spin * movement,
  }
}

function drawHeart(context, x, y, size, color, alpha = 1, rotation = 0) {
  const heartWidth = size / 1.04
  const heartHeight = size / 0.94

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

function findHeroIndex(particles, width, height) {
  if (particles.length === 0) return -1

  let bestIndex = 0
  let bestDistance = Infinity
  particles.forEach((particle, index) => {
    const distance = Math.hypot(particle.startX - width / 2, particle.startY - height / 2)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

export default function WelcomeStage({
  onNext,
  reverseOnMount = false,
  transitionRef,
}) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const onNextRef = useRef(onNext)
  const controlsRef = useRef({ previous: () => {}, next: () => {} })
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPink, setIsPink] = useState(false)
  const [canNavigate, setCanNavigate] = useState(false)

  onNextRef.current = onNext

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return undefined

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let pixelRatio = 1
    let layout = null
    let animationFrame = 0
    let introStartedAt = performance.now()
    let playbackStartedAt = 0
    let playbackFrom = 0
    let playbackDirection = 1
    let phase = reverseOnMount || reduceMotion ? 'idle' : 'intro'
    let heroIndex = -1

    const drawBackground = (color) => {
      context.globalAlpha = 1
      context.fillStyle = color
      context.fillRect(0, 0, width, height)
    }

    const drawIdle = () => {
      drawBackground(BACKGROUND)
      drawGreeting(context, width, layout, 1)
    }

    const drawIntro = (now) => {
      const elapsed = Math.max(0, (now - introStartedAt) / 1000)
      const firstProgress = easeOutCubic(elapsed / INTRO_FIRST_DURATION)
      const secondProgress = easeOutCubic(
        (elapsed - INTRO_SECOND_START) / INTRO_SECOND_DURATION,
      )

      drawBackground(BACKGROUND)
      drawGreeting(
        context,
        width,
        layout,
        1,
        firstProgress,
        secondProgress,
        (1 - firstProgress) * 18,
        (1 - secondProgress) * 18,
      )

      if (elapsed >= INTRO_TOTAL_DURATION) {
        phase = 'idle'
        drawIdle()
        setCanNavigate(true)
        return false
      }

      return true
    }

    const animateIntro = (now) => {
      if (phase !== 'intro') return

      if (drawIntro(now)) {
        animationFrame = window.requestAnimationFrame(animateIntro)
      }
    }

    const renderTransitionFrame = (elapsed) => {
      if (elapsed >= TOTAL_DURATION) {
        drawBackground(PINK)
        return
      }

      drawBackground(BACKGROUND)
      const particles = particlesRef.current
      const hero = heroIndex >= 0 ? particles[heroIndex] : undefined

      if (elapsed < SCATTER_START) {
        const dissolveProgress = smoothstep(
          (elapsed - DISSOLVE_START) / DISSOLVE_DURATION,
        )
        drawGreeting(context, width, layout, 1 - dissolveProgress)

        particles.forEach((particle) => {
          const formationProgress = easeOutCubic(
            (elapsed - DISSOLVE_START - particle.delay) / FORMATION_DURATION,
          )

          if (formationProgress <= 0.005) return

          drawHeart(
            context,
            particle.startX,
            particle.startY,
            particle.size,
            particle.color,
            formationProgress,
            particle.rotation,
          )
        })
        return
      }

      particles.forEach((particle, index) => {
        if (index === heroIndex) return

        const position = getParticlePosition(particle, elapsed)
        const fadeOut = 1 - smoothstep((position.progress - 0.42) / 0.58)

        if (fadeOut <= 0.005) return

        drawHeart(
          context,
          position.x,
          position.y,
          particle.size,
          particle.color,
          fadeOut,
          position.rotation,
        )
      })

      if (hero) {
        const heroElapsed = elapsed - HERO_START
        const moveProgress = easeInOutCubic(heroElapsed / HERO_MOVE_DURATION)
        const x = lerp(hero.startX, width / 2, moveProgress)
        const y = lerp(hero.startY, height / 2, moveProgress)
        const growthProgress = easeInCubic(heroElapsed / HERO_GROW_DURATION)
        const coverSize = Math.max(width, height) * 5.5
        const size = lerp(hero.size, coverSize, growthProgress)

        drawHeart(context, x, y, size, PINK, 1, 0)
      }
    }

    const startPlayback = (direction) => {
      const mayReverseFromDone = direction === -1 && phase === 'done'
      if (phase !== 'idle' && !mayReverseFromDone) return

      if (reduceMotion) {
        if (direction === 1) {
          phase = 'done'
          drawBackground(PINK)
          setIsPink(true)
          setCanNavigate(false)
          onNextRef.current?.()
        } else {
          phase = 'idle'
          drawIdle()
          setIsPink(false)
          setCanNavigate(true)
        }
        return
      }

      const cached = transitionRef?.current
      if (cached?.particles?.length) {
        particlesRef.current = cached.particles

        if (cached.width > 0 && cached.height > 0) {
          const scaleX = width / cached.width
          const scaleY = height / cached.height
          particlesRef.current.forEach((particle) => {
            particle.startX *= scaleX
            particle.startY *= scaleY
            particle.driftX *= scaleX
            particle.driftY *= scaleY
          })
        }

        heroIndex = cached.heroIndex
      } else {
        particlesRef.current = createTextSamples(width, height, pixelRatio, layout)
        heroIndex = findHeroIndex(particlesRef.current, width, height)
        if (heroIndex >= 0) particlesRef.current[heroIndex].color = PINK
      }

      if (transitionRef) {
        transitionRef.current = {
          particles: particlesRef.current,
          heroIndex,
          width,
          height,
        }
      }

      playbackDirection = direction
      playbackFrom = direction === 1 ? 0 : TOTAL_DURATION
      playbackStartedAt = performance.now()
      phase = 'playback'
      setIsAnimating(true)
      setIsPink(false)
      setCanNavigate(false)

      if (direction === -1) renderTransitionFrame(TOTAL_DURATION)
      else renderTransitionFrame(0)

      animationFrame = window.requestAnimationFrame(animatePlayback)
    }

    const animatePlayback = (now) => {
      if (phase !== 'playback') return

      const elapsedDelta = Math.max(0, (now - playbackStartedAt) / 1000)
      const elapsed = playbackFrom + playbackDirection * elapsedDelta

      if (playbackDirection === 1 && elapsed >= TOTAL_DURATION) {
        drawBackground(PINK)
        phase = 'done'
        particlesRef.current = transitionRef?.current?.particles ?? particlesRef.current
        setIsPink(true)
        setIsAnimating(false)

        if (onNextRef.current) {
          setCanNavigate(false)
          onNextRef.current()
        } else {
          setCanNavigate(true)
        }
        return
      }

      if (playbackDirection === -1 && elapsed <= 0) {
        renderTransitionFrame(0)
        phase = 'idle'
        setIsPink(false)
        setIsAnimating(false)
        setCanNavigate(true)
        return
      }

      renderTransitionFrame(elapsed)
      animationFrame = window.requestAnimationFrame(animatePlayback)
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

      if (phase === 'playback' && previousWidth > 0 && previousHeight > 0) {
        const scaleX = width / previousWidth
        const scaleY = height / previousHeight
        particlesRef.current.forEach((particle) => {
          particle.startX *= scaleX
          particle.startY *= scaleY
          particle.driftX *= scaleX
          particle.driftY *= scaleY
        })
        if (transitionRef?.current) {
          transitionRef.current.width = width
          transitionRef.current.height = height
        }
      }

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      layout = createLayout(context, width, height)

      if (phase === 'intro') drawIntro(performance.now())
      if (phase === 'idle') drawIdle()
      if (phase === 'done') drawBackground(PINK)
      if (phase === 'playback') {
        const elapsedDelta = Math.max(0, (performance.now() - playbackStartedAt) / 1000)
        renderTransitionFrame(playbackFrom + playbackDirection * elapsedDelta)
      }
    }

    controlsRef.current = {
      previous: () => startPlayback(-1),
      next: () => startPlayback(1),
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    if (phase === 'intro') {
      animationFrame = window.requestAnimationFrame(animateIntro)
    } else if (reverseOnMount) {
      startPlayback(-1)
    } else {
      drawIdle()
      setCanNavigate(true)
    }

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(animationFrame)
    }
  }, [reverseOnMount, transitionRef])

  return (
    <main className={'welcome-stage' + (isPink ? ' welcome-stage--pink' : '')}>
      <canvas
        ref={canvasRef}
        className="welcome-stage__canvas"
        aria-hidden="true"
      />
      <StageControls
        onPrevious={() => controlsRef.current.previous()}
        onNext={() => controlsRef.current.next()}
        previousDisabled={!canNavigate || isAnimating}
        nextDisabled={!canNavigate || isAnimating}
      />
    </main>
  )
}
