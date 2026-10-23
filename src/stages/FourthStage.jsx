import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import TextGlitchCanvas from './TextGlitchCanvas.jsx'
import './FourthStage.css'

const MESSAGES = [
  'Что за хрень?',
  'Как я сюда попал?',
  'А это еще что..?',
]

const IMAGES = [
  '/step-four-assets/rus-shocked.png',
  '/step-four-assets/rus-confused.png',
  '/step-four-assets/rus-turned-around.png',
]
const ARRIVAL_IMAGE = '/step-four-assets/and-first-show.png'

const STAR_COUNT = 94
const INITIAL_PAUSE_MS = 3000
const FIRST_TEXT_DELAY_MS = 680
const TYPEWRITER_INTERVAL_MS = 52
const NEXT_TEXT_DELAY_MS = 90
const IMAGE_RISE_DISTANCE_PERCENT = 30
const IMAGE_RISE_DURATION_MS = 1200

const TARGETING_DURATION_MS = 1350
const TRAVEL_DURATION_MS = 5000
const BLACKOUT_DURATION_MS = 950
const REVEAL_DURATION_MS = 1400
const MAX_TRAVEL_DISTANCE_KM = 12_800_000
const RULER_TICK_COUNT = 9

function createStars() {
  const colors = ['#f5f7ff', '#c9d7ff', '#f6eaff', '#d7f5ff']

  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const size = index % 13 === 0 ? 3 : index % 4 === 0 ? 2.5 : 2
    const isBright = index % 9 === 0

    return {
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size,
      delay: INITIAL_PAUSE_MS + Math.round(Math.random() * 6800),
      duration: Math.round(1050 + Math.random() * 900),
      twinkleDuration: Math.round(1500 + Math.random() * 3200),
      opacity: (0.38 + Math.random() * 0.56).toFixed(2),
      color: colors[Math.floor(Math.random() * colors.length)],
      isBright,
    }
  })
}

function createSpeedStreaks() {
  return Array.from({ length: 56 }, (_, index) => ({
    id: index,
    x: Math.random() * 100,
    y: Math.random() * 100,
    width: 40 + Math.random() * 170,
    phase: Math.random() * Math.PI * 2,
    drift: 0.45 + Math.random() * 1.2,
    brightness: 0.45 + Math.random() * 0.55,
  }))
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

function formatKilometers(value) {
  return Math.round(value).toLocaleString('ru-RU') + ' км'
}

export default function FourthStage({ onPrevious }) {
  const stars = useMemo(createStars, [])
  const speedStreaks = useMemo(createSpeedStreaks, [])
  const stageRef = useRef(null)
  const starfieldRef = useRef(null)
  const characterTravelRef = useRef(null)
  const messageFrameRef = useRef(null)
  const imageFrameRef = useRef(null)
  const imageRef = useRef(null)
  const imageGlitchCanvasRef = useRef(null)
  const speedStreakRefs = useRef([])
  const starElementRefs = useRef([])
  const traveledValueRef = useRef(null)
  const remainingValueRef = useRef(null)
  const rulerTickRefs = useRef([])
  const rulerLabelRefs = useRef([])
  const travelTargetRef = useRef(null)
  const hasSwitchedImageDuringGlitchRef = useRef(false)

  const [messageIndex, setMessageIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const [isGlitching, setIsGlitching] = useState(false)
  const [isImageRising, setIsImageRising] = useState(false)
  const [travelPhase, setTravelPhase] = useState('idle')
  const [targetStarId, setTargetStarId] = useState(null)

  const starsForArrival = travelPhase === 'arrival' ||
    travelPhase === 'revealing' ||
    travelPhase === 'arrived'

  useEffect(() => {
    const characters = Array.from(MESSAGES[messageIndex])
    let characterIndex = 0
    let timerId = 0

    setTypedText('')
    setIsTypingComplete(false)

    const typeNextCharacter = () => {
      characterIndex += 1
      if (messageIndex === 0 && characterIndex === 1) {
        setIsImageRising(true)
      }
      setTypedText(characters.slice(0, characterIndex).join(''))

      if (characterIndex >= characters.length) {
        setIsTypingComplete(true)
        return
      }

      const lastCharacter = characters[characterIndex - 1]
      const punctuationDelay = /[?!.,…]/u.test(lastCharacter) ? 145 : 0
      timerId = window.setTimeout(
        typeNextCharacter,
        TYPEWRITER_INTERVAL_MS + punctuationDelay,
      )
    }

    timerId = window.setTimeout(
      typeNextCharacter,
      messageIndex === 0 ? INITIAL_PAUSE_MS + FIRST_TEXT_DELAY_MS : NEXT_TEXT_DELAY_MS,
    )

    return () => window.clearTimeout(timerId)
  }, [messageIndex])

  const beginSpaceTravel = useCallback(() => {
    const visibleStars = stars.filter((star) => {
      const element = starElementRefs.current[star.id]
      return element && Number.parseFloat(window.getComputedStyle(element).opacity) > 0.2
    })
    const leftSideStars = visibleStars.filter((star) => star.x <= 48)
    const candidates = leftSideStars.length > 0
      ? leftSideStars
      : visibleStars.length > 0
        ? visibleStars
        : stars
    const target = candidates[Math.floor(Math.random() * candidates.length)]

    travelTargetRef.current = target
    setTargetStarId(target.id)
    setTravelPhase('targeting')
  }, [stars])

  const switchImageDuringGlitch = useCallback(() => {
    if (hasSwitchedImageDuringGlitchRef.current) return
    hasSwitchedImageDuringGlitchRef.current = true
    setImageIndex((current) => Math.min(current + 1, IMAGES.length - 1))
  }, [])

  const finishTextGlitch = useCallback(() => {
    // Always advance the image and caption together, even if the canvas
    // animation failed to initialize or its requestAnimationFrame was paused.
    switchImageDuringGlitch()
    setMessageIndex((current) => Math.min(current + 1, MESSAGES.length - 1))
    setIsGlitching(false)
  }, [switchImageDuringGlitch])

  useEffect(() => {
    if (!isGlitching) return undefined

    // A safety net keeps the invisible full-screen click zones from remaining
    // locked if a browser can't render the glitch canvas.
    const timeout = window.setTimeout(finishTextGlitch, 900)
    return () => window.clearTimeout(timeout)
  }, [isGlitching, finishTextGlitch])

  const handleNext = () => {
    if (!isTypingComplete || isGlitching || travelPhase !== 'idle') return

    if (messageIndex < MESSAGES.length - 1) {
      hasSwitchedImageDuringGlitchRef.current = false
      setIsGlitching(true)
      return
    }

    beginSpaceTravel()
  }

  useEffect(() => {
    if (travelPhase !== 'targeting') return undefined
    const timeout = window.setTimeout(() => setTravelPhase('traveling'), TARGETING_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [travelPhase])

  // Each original pixel star is projected independently. The starfield container
  // never scales; the same DOM stars move, grow in CSS pixels, vanish and respawn.
  useEffect(() => {
    if (travelPhase !== 'traveling') return undefined

    const character = characterTravelRef.current
    const target = travelTargetRef.current
    if (!character || !target) {
      setTravelPhase('blackout')
      return undefined
    }

    const viewportWidth = Math.max(1, window.innerWidth)
    const viewportHeight = Math.max(1, window.innerHeight)
    const startedAt = performance.now()
    let lastFrameAt = startedAt
    let lastHudUpdate = 0
    let animationFrame = 0
    const targetOriginX = (target.x / 100) * viewportWidth
    const targetOriginY = (target.y / 100) * viewportHeight
    const motion = stars.map((star) => ({
      id: star.id,
      originX: (star.x / 100) * viewportWidth,
      originY: (star.y / 100) * viewportHeight,
      baseSize: star.size,
      baseOpacity: Number.parseFloat(star.opacity),
      speed: 0.78 + Math.random() * 0.58,
      depth: 1,
      bornAt: 0,
      isTarget: star.id === target.id,
    }))
    const targetMotion = motion.find((star) => star.isTarget)

    const render = (timestamp) => {
      const elapsed = Math.max(0, timestamp - startedAt)
      const delta = Math.min(42, Math.max(0, timestamp - lastFrameAt))
      lastFrameAt = timestamp
      const progress = Math.min(1, elapsed / TRAVEL_DURATION_MS)
      const centerX = Math.max(1, window.innerWidth) / 2
      const centerY = Math.max(1, window.innerHeight) / 2
      const targetApproach = easeInOutCubic(Math.min(1, progress / 0.72))
      const focusX = targetOriginX + (centerX - targetOriginX) * targetApproach
      const focusY = targetOriginY + (centerY - targetOriginY) * targetApproach
      const perspectiveSpeed = 0.00007 + progress * 0.00024

      motion.forEach((star) => {
        const element = starElementRefs.current[star.id]
        if (!element) return

        let screenX
        let screenY
        let size
        let opacity

        if (star.isTarget) {
          // The target is the actual pixel star picked from the scene. Its CSS
          // pixels grow in place; no SVG, bitmap, halo or replacement graphic.
          const targetGrowth = 1 + 34 * Math.pow(progress, 2.65)
          screenX = focusX
          screenY = focusY
          size = star.baseSize * targetGrowth
          opacity = star.baseOpacity * Math.max(0, 1 - Math.max(0, (progress - 0.86) / 0.14))
        } else {
          star.depth -= delta * perspectiveSpeed * star.speed

          let scale = 1 / Math.max(0.12, star.depth)
          screenX = focusX + (star.originX - targetOriginX) * scale
          screenY = focusY + (star.originY - targetOriginY) * scale
          size = star.baseSize * scale

          const justPassedCamera = star.depth <= 0.12
          const leftScreen = screenX < -size * 3 - 48
          const rightScreen = screenX > window.innerWidth + size * 3 + 48
          const aboveScreen = screenY < -size * 3 - 48
          const belowScreen = screenY > window.innerHeight + size * 3 + 48

          if (justPassedCamera || leftScreen || rightScreen || aboveScreen || belowScreen) {
            // Spawn a fresh distant star near the vanishing point, fade it in,
            // and let it travel outward with its own depth/speed.
            star.depth = 1
            star.speed = 0.78 + Math.random() * 0.58
            const angle = Math.random() * Math.PI * 2
            const radius = 14 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.12
            star.originX = targetOriginX + Math.cos(angle) * radius
            star.originY = targetOriginY + Math.sin(angle) * radius
            star.bornAt = timestamp
            scale = 1
            screenX = focusX + (star.originX - targetOriginX)
            screenY = focusY + (star.originY - targetOriginY)
            size = star.baseSize
          }

          const birthFade = star.bornAt
            ? Math.min(1, Math.max(0, (timestamp - star.bornAt) / 230))
            : 1
          const nearFade = Math.max(0, Math.min(1, (star.depth - 0.12) / 0.19))
          opacity = star.baseOpacity * birthFade * nearFade
        }

        element.style.left = screenX + 'px'
        element.style.top = screenY + 'px'
        element.style.transform = 'translate3d(-50%, -50%, 0)'
        element.style.setProperty('--star-size', size + 'px')
        element.style.opacity = String(opacity)
      })

      const characterProgress = easeInOutCubic(progress)
      // Rus keeps his size and leaves through the lower-right edge.
      character.style.transform =
        'translate3d(' + (window.innerWidth * 1.05 * characterProgress) + 'px, ' +
        (window.innerHeight * 1.05 * characterProgress) + 'px, 0)'
      character.style.opacity = String(Math.max(0, 1 - Math.max(0, (progress - 0.48) / 0.52)))

      const distanceCurve = 0.12 * progress + 0.88 * Math.pow(progress, 2.35)
      const traveled = MAX_TRAVEL_DISTANCE_KM * distanceCurve

      speedStreakRefs.current.forEach((element, index) => {
        if (!element) return
        const streak = speedStreaks[index]
        const pulse = (Math.sin(timestamp / 105 + streak.phase) + 1) / 2
        const stretch = 0.15 + 2.9 * Math.pow(progress, 1.25)
        const driftX = -progress * (180 + streak.drift * 380)
        const driftY = Math.sin(timestamp / 220 + streak.phase) * progress * 24
        element.style.transform =
          'translate3d(' + driftX + 'px, ' + driftY + 'px, 0) scaleX(' + stretch + ')'
        element.style.opacity = String(
          Math.min(0.88, progress * streak.brightness * (0.28 + pulse * 0.72)),
        )
      })

      if (timestamp - lastHudUpdate >= 85 || progress >= 1) {
        if (traveledValueRef.current) {
          traveledValueRef.current.textContent = formatKilometers(traveled)
        }
        if (remainingValueRef.current) {
          remainingValueRef.current.textContent = formatKilometers(
            Math.max(0, MAX_TRAVEL_DISTANCE_KM - traveled),
          )
        }

        const offset = (elapsed * (0.045 + progress * 0.11)) % 52
        const rulerScale = 0.72 + progress * 0.82
        rulerTickRefs.current.forEach((element, index) => {
          if (!element) return
          const stagger = (index % 2 === 0 ? 1 : -1) * progress * 10
          element.style.transform =
            'translate3d(0, ' + (offset - 26 + stagger) + 'px, 0) scaleX(' + rulerScale + ')'
        })
        rulerLabelRefs.current.forEach((element, index) => {
          if (!element) return
          const relativeKm = traveled + (index - (RULER_TICK_COUNT - 1) / 2) * 690_000
          element.textContent = Math.max(0, relativeKm / 1_000_000).toFixed(1) + ' млн'
        })
        lastHudUpdate = timestamp
      }

      if (progress >= 1) {
        setTravelPhase('blackout')
        return
      }

      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)

    return () => window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [travelPhase, stars])

  // Keep the scene completely black while restoring the same starfield and
  // setting up the new character's entrance underneath the fade.
  useEffect(() => {
    if (travelPhase === 'blackout') {
      const timeout = window.setTimeout(() => {
        stars.forEach((star) => {
          const element = starElementRefs.current[star.id]
          if (!element) return
          element.style.left = star.x + '%'
          element.style.top = star.y + '%'
          element.style.transform = ''
          element.style.opacity = ''
          element.style.removeProperty('--star-size')
        })
        if (characterTravelRef.current) {
          characterTravelRef.current.style.transform = 'none'
          characterTravelRef.current.style.opacity = ''
        }
        setTargetStarId(null)
        setTravelPhase('arrival')
      }, BLACKOUT_DURATION_MS)

      return () => window.clearTimeout(timeout)
    }

    if (travelPhase === 'arrival') {
      const timeout = window.setTimeout(() => setTravelPhase('revealing'), 90)
      return () => window.clearTimeout(timeout)
    }

    if (travelPhase === 'revealing') {
      const timeout = window.setTimeout(() => setTravelPhase('arrived'), REVEAL_DURATION_MS)
      return () => window.clearTimeout(timeout)
    }

    return undefined
  }, [travelPhase, stars])

  const isTravelOverlayVisible = travelPhase === 'blackout' || travelPhase === 'arrival'
  const showTravelEffects = travelPhase === 'traveling' || travelPhase === 'blackout'
  const showControls = travelPhase === 'idle' || travelPhase === 'arrived'

  return (
    <main
      ref={stageRef}
      className={
        'stage-four' +
        (travelPhase === 'targeting' ? ' stage-four--targeting' : '') +
        (travelPhase === 'traveling' ? ' stage-four--traveling' : '') +
        (starsForArrival ? ' stage-four--arrived' : '')
      }
      aria-label="Четвёртый этап"
    >
      <div ref={starfieldRef} className="stage-four__starfield" aria-hidden="true">
        {stars.map((star) => (
          <span
            key={star.id}
            ref={(element) => {
              starElementRefs.current[star.id] = element
            }}
            className={
              'stage-four__star' +
              (star.isBright ? ' stage-four__star--bright' : '') +
              (star.id === targetStarId ? ' stage-four__star--target' : '')
            }
            style={{
              left: star.x + '%',
              top: star.y + '%',
              '--star-size': star.size + 'px',
              '--star-delay': star.delay + 'ms',
              '--star-duration': star.duration + 'ms',
              '--star-twinkle-duration': star.twinkleDuration + 'ms',
              '--star-opacity': star.opacity,
              '--star-color': star.color,
            }}
          >
            <span className="stage-four__star-pixel" />
          </span>
        ))}
      </div>

      {showTravelEffects && (
        <>
          <div className="stage-four__speed-streaks" aria-hidden="true">
            {speedStreaks.map((streak) => (
              <span
                key={streak.id}
                ref={(element) => {
                  speedStreakRefs.current[streak.id] = element
                }}
                className="stage-four__speed-streak"
                style={{
                  left: streak.x + '%',
                  top: streak.y + '%',
                  width: streak.width + 'px',
                }}
              />
            ))}
          </div>

          <aside className="stage-four__travel-hud" aria-hidden="true">
            <div className="stage-four__travel-hud-heading">КОСМИЧЕСКАЯ ДИСТАНЦИЯ</div>
            <div className="stage-four__travel-hud-label">ПРОЙДЕНО</div>
            <div ref={traveledValueRef} className="stage-four__travel-hud-value">0 км</div>
            <div className="stage-four__travel-hud-label stage-four__travel-hud-label--remaining">
              ДО ЦЕЛИ
            </div>
            <div ref={remainingValueRef} className="stage-four__travel-hud-value">12 800 000 км</div>
            <div className="stage-four__ruler">
              {Array.from({ length: RULER_TICK_COUNT }, (_, index) => (
                <div
                  key={index}
                  ref={(element) => {
                    rulerTickRefs.current[index] = element
                  }}
                  className={
                    'stage-four__ruler-tick' +
                    (index % 2 === 0 ? ' stage-four__ruler-tick--major' : '')
                  }
                >
                  <span className="stage-four__ruler-mark" />
                  <span
                    ref={(element) => {
                      rulerLabelRefs.current[index] = element
                    }}
                    className="stage-four__ruler-label"
                  >
                    0.0 млн
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </>
      )}

      <div
        ref={characterTravelRef}
        className="stage-four__character-travel"
        aria-hidden="true"
      >
        <div
          ref={imageFrameRef}
          className={
            'stage-four__image-frame' +
            (starsForArrival
              ? ' stage-four__image-frame--arriving'
              : isImageRising
                ? ' stage-four__image-frame--rising'
                : '') +
            (isGlitching ? ' stage-four__image-frame--glitching' : '')
          }
          style={{
            '--image-rise-distance': IMAGE_RISE_DISTANCE_PERCENT + 'vh',
            '--image-rise-duration': IMAGE_RISE_DURATION_MS + 'ms',
          }}
        >
          <img
            ref={imageRef}
            className="stage-four__image"
            src={starsForArrival ? ARRIVAL_IMAGE : IMAGES[imageIndex]}
            alt=""
          />
          {isGlitching && (
            <canvas
              ref={imageGlitchCanvasRef}
              className="stage-four__image-glitch-canvas"
            />
          )}
        </div>
      </div>

      <div className="stage-four__content">
        <div
          ref={messageFrameRef}
          className={
            'stage-four__message-frame' +
            (isGlitching ? ' stage-four__message-frame--glitching' : '') +
            (travelPhase !== 'idle' ? ' stage-four__message-frame--hidden' : '')
          }
        >
          <p className="stage-four__message" aria-live="polite">
            {typedText}
          </p>
          {isGlitching && (
            <TextGlitchCanvas
              text={MESSAGES[messageIndex]}
              frameRef={messageFrameRef}
              imageFrameRef={imageFrameRef}
              imageRef={imageRef}
              imageCanvasRef={imageGlitchCanvasRef}
              onImageSwitch={switchImageDuringGlitch}
              onComplete={finishTextGlitch}
            />
          )}
        </div>
      </div>

      {showControls && (
        <StageControls
          onPrevious={onPrevious}
          onNext={handleNext}
          previousDisabled={!onPrevious}
          nextDisabled={
            travelPhase !== 'idle' ||
            !isTypingComplete ||
            isGlitching ||
            (messageIndex >= MESSAGES.length - 1 && travelPhase !== 'idle')
          }
        />
      )}

      <div
        className={
          'stage-four__travel-fade' +
          (isTravelOverlayVisible ? ' stage-four__travel-fade--visible' : '')
        }
        aria-hidden="true"
      />
    </main>
  )
}
