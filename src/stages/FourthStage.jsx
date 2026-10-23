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

function createFlightStars() {
  return Array.from({ length: 220 }, (_, id) => ({
    id,
    // Normalized 3D coordinates; every star is projected independently.
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: 0.16 + Math.random() * 0.84,
    speed: 0.68 + Math.random() * 0.82,
    size: 0.7 + Math.random() * 1.25,
    spawnedAt: 0,
  }))
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
  const flightStars = useMemo(createFlightStars, [])
  const stageRef = useRef(null)
  const starfieldRef = useRef(null)
  const characterTravelRef = useRef(null)
  const messageFrameRef = useRef(null)
  const imageFrameRef = useRef(null)
  const imageRef = useRef(null)
  const imageGlitchCanvasRef = useRef(null)
  const speedStreakRefs = useRef([])
  const flightStarRefs = useRef([])
  const vectorTargetRef = useRef(null)
  const targetCoreRef = useRef(null)
  const targetHaloRef = useRef(null)
  const targetRingOneRef = useRef(null)
  const targetRingTwoRef = useRef(null)
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
    const leftSideStars = stars.filter((star) => star.x <= 48)
    const candidates = leftSideStars.length > 0 ? leftSideStars : stars
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

  // The trip itself is driven by requestAnimationFrame and direct style writes,
  // avoiding a React render on every frame and keeping the zoom smooth.
  useEffect(() => {
    if (travelPhase !== 'traveling') return undefined

    const starfield = starfieldRef.current
    const character = characterTravelRef.current
    const target = travelTargetRef.current
    if (!starfield || !character || !target) {
      setTravelPhase('blackout')
      return undefined
    }

    const startedAt = performance.now()
    let animationFrame = 0
    let lastHudUpdate = 0
    let lastFrameAt = startedAt
    const width = () => Math.max(1, window.innerWidth)
    const height = () => Math.max(1, window.innerHeight)

    const render = (timestamp) => {
      const elapsed = Math.max(0, timestamp - startedAt)
      const delta = Math.min(42, Math.max(0, timestamp - lastFrameAt))
      lastFrameAt = timestamp
      const progress = Math.min(1, elapsed / TRAVEL_DURATION_MS)
      const viewportWidth = width()
      const viewportHeight = height()
      const centerX = viewportWidth / 2
      const centerY = viewportHeight / 2

      // The starfield itself is never scaled. Each star has independent depth,
      // is perspective-projected, then respawns at the far plane after passing us.
      flightStarRefs.current.forEach((element, index) => {
        if (!element) return
        const star = flightStars[index]
        star.z -= delta * (0.00011 + progress * 0.0005) * star.speed

        if (star.z <= 0.105) {
          star.z = 1
          star.x = Math.random() * 2 - 1
          star.y = Math.random() * 2 - 1
          star.speed = 0.68 + Math.random() * 0.82
          star.spawnedAt = timestamp
        }

        const depth = Math.max(0.105, star.z)
        const perspective = 1 / depth
        const offsetX = star.x * viewportWidth * 0.46 * perspective
        const offsetY = star.y * viewportHeight * 0.46 * perspective
        const size = star.size * (0.8 + (1 - depth) * 4.8)
        const nearFade = Math.max(0, Math.min(1, (depth - 0.105) / 0.18))
        const birthFade = star.spawnedAt
          ? Math.min(1, Math.max(0, (timestamp - star.spawnedAt) / 210))
          : 1

        element.style.width = size + 'px'
        element.style.height = size + 'px'
        element.style.transform =
          'translate3d(' + offsetX + 'px, ' + offsetY + 'px, 0)'
        element.style.opacity = String(nearFade * birthFade)
      })

      // The selected star is a standalone SVG. Vector edges stay crisp as it grows.
      const targetX = (target.x / 100) * viewportWidth
      const targetY = (target.y / 100) * viewportHeight
      const targetApproach = easeInOutCubic(Math.min(1, progress / 0.72))
      const vectorX = targetX + (centerX - targetX) * targetApproach
      const vectorY = targetY + (centerY - targetY) * targetApproach
      const targetSize = 64 + Math.pow(progress, 2.65) * Math.max(viewportWidth, viewportHeight) * 2.25

      if (vectorTargetRef.current) {
        vectorTargetRef.current.style.left = vectorX + 'px'
        vectorTargetRef.current.style.top = vectorY + 'px'
        vectorTargetRef.current.style.width = targetSize + 'px'
        vectorTargetRef.current.style.height = targetSize + 'px'
      }
      if (targetHaloRef.current) {
        targetHaloRef.current.setAttribute('r', String(28 + progress * 50))
        targetHaloRef.current.style.opacity = String(0.72 + progress * 0.28)
      }
      if (targetCoreRef.current) {
        targetCoreRef.current.setAttribute('r', String(3.5 + progress * 7))
      }
      if (targetRingOneRef.current) {
        targetRingOneRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.35))
      }
      if (targetRingTwoRef.current) {
        targetRingTwoRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.55))
      }

      const characterProgress = easeInOutCubic(progress)
      // Rus keeps his size and exits diagonally; only position and opacity change.
      character.style.transform =
        'translate3d(' + (viewportWidth * 1.05 * characterProgress) + 'px, ' +
        (viewportHeight * 1.05 * characterProgress) + 'px, 0)'
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
  }, [travelPhase, speedStreaks, flightStars])

  // Keep the scene completely black while restoring the same starfield and
  // setting up the new character's entrance underneath the fade.
  useEffect(() => {
    if (travelPhase === 'blackout') {
      const timeout = window.setTimeout(() => {
        if (starfieldRef.current) starfieldRef.current.style.transform = 'none'
        if (characterTravelRef.current) characterTravelRef.current.style.transform = 'none'
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
  }, [travelPhase])

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

      {(travelPhase === 'targeting' || travelPhase === 'traveling' || travelPhase === 'blackout') &&
        travelTargetRef.current && (
          <svg
            ref={vectorTargetRef}
            className="stage-four__vector-target"
            viewBox="-48 -48 96 96"
            aria-hidden="true"
            focusable="false"
            style={{
              left: travelTargetRef.current.x + '%',
              top: travelTargetRef.current.y + '%',
            }}
          >
            <defs>
              <radialGradient id="stage-four-target-halo">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="18%" stopColor="#d9efff" stopOpacity=".98" />
                <stop offset="48%" stopColor="#79bdff" stopOpacity=".42" />
                <stop offset="100%" stopColor="#4e9cff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="stage-four-target-core">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="55%" stopColor="#eff8ff" />
                <stop offset="100%" stopColor="#a7d7ff" />
              </radialGradient>
            </defs>
            <circle cx="0" cy="0" r="46" fill="url(#stage-four-target-halo)" opacity=".75" />
            <circle ref={targetHaloRef} cx="0" cy="0" r="28" fill="url(#stage-four-target-halo)" />
            <circle ref={targetRingOneRef} className="stage-four__vector-target-ring stage-four__vector-target-ring--one" cx="0" cy="0" r="15" />
            <circle ref={targetRingTwoRef} className="stage-four__vector-target-ring stage-four__vector-target-ring--two" cx="0" cy="0" r="23" />
            <path d="M-20 0H-8 M8 0H20 M0 -20V-8 M0 8V20" className="stage-four__vector-target-crosshair" />
            <circle ref={targetCoreRef} cx="0" cy="0" r="3.5" fill="url(#stage-four-target-core)" />
            <path d="M0 -10L2.2 -2.2L10 0L2.2 2.2L0 10L-2.2 2.2L-10 0L-2.2 -2.2Z" fill="#ffffff" />
          </svg>
        )}

      {showTravelEffects && (
        <>
          <div className="stage-four__flight-field" aria-hidden="true">
            {flightStars.map((star) => (
              <span
                key={star.id}
                ref={(element) => {
                  flightStarRefs.current[star.id] = element
                }}
                className="stage-four__flight-star"
                style={{
                  width: star.size + 'px',
                  height: star.size + 'px',
                }}
              />
            ))}
          </div>
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
