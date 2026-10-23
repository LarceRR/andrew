import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import TextGlitchCanvas from './TextGlitchCanvas.jsx'
import './FourthStage.css'

const MESSAGES = [
  'Что за хрень?',
  'Как я сюда попал?',
]

const STAR_COUNT = 94
const INITIAL_PAUSE_MS = 3000
const FIRST_TEXT_DELAY_MS = 680
const TYPEWRITER_INTERVAL_MS = 52
const NEXT_TEXT_DELAY_MS = 90
const IMAGE_RISE_DISTANCE_PERCENT = 30
const IMAGE_RISE_DURATION_MS = 1200

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

export default function FourthStage({ onPrevious }) {
  const stars = useMemo(createStars, [])
  const messageFrameRef = useRef(null)
  const imageFrameRef = useRef(null)
  const imageRef = useRef(null)
  const imageGlitchCanvasRef = useRef(null)
  const [messageIndex, setMessageIndex] = useState(0)
  const [imageIndex, setImageIndex] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const [isGlitching, setIsGlitching] = useState(false)
  const [isImageRising, setIsImageRising] = useState(false)

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

  const switchImageDuringGlitch = useCallback(() => {
    setImageIndex(1)
  }, [])

  const finishTextGlitch = useCallback(() => {
    setMessageIndex(1)
    setIsGlitching(false)
  }, [])

  const handleNext = () => {
    if (!isTypingComplete || isGlitching || messageIndex >= MESSAGES.length - 1) return
    setIsGlitching(true)
  }

  return (
    <main className="stage-four" aria-label="Четвёртый этап">
      <div className="stage-four__starfield" aria-hidden="true">
        {stars.map((star) => (
          <span
            key={star.id}
            className={
              'stage-four__star' +
              (star.isBright ? ' stage-four__star--bright' : '')
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

      <div
        ref={imageFrameRef}
        className={
          'stage-four__image-frame' +
          (isImageRising ? ' stage-four__image-frame--rising' : '') +
          (isGlitching ? ' stage-four__image-frame--glitching' : '')
        }
        style={{
          '--image-rise-distance': IMAGE_RISE_DISTANCE_PERCENT + 'vh',
          '--image-rise-duration': IMAGE_RISE_DURATION_MS + 'ms',
        }}
        aria-hidden="true"
      >
        <img
          ref={imageRef}
          className="stage-four__image"
          src={
            imageIndex === 0
              ? '/step-four-assets/rus-shocked.png'
              : '/step-four-assets/rus-confused.png'
          }
          alt=""
        />
        {isGlitching && (
          <canvas
            ref={imageGlitchCanvasRef}
            className="stage-four__image-glitch-canvas"
          />
        )}
      </div>

      <div className="stage-four__content">
        <div
          ref={messageFrameRef}
          className={
            'stage-four__message-frame' +
            (isGlitching ? ' stage-four__message-frame--glitching' : '')
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

      <StageControls
        onPrevious={onPrevious}
        onNext={handleNext}
        previousDisabled={!onPrevious}
        nextDisabled={
          !isTypingComplete ||
          isGlitching ||
          messageIndex >= MESSAGES.length - 1
        }
      />
    </main>
  )
}
