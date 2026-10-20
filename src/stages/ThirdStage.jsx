import { useEffect, useMemo, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import './ThirdStage.css'

// Add or remove paths here as photos are added to public/step-three-images.
// Use the real file extension (.jpg, .jpeg, .png, .webp).
const SLIDESHOW_IMAGES = [
  '/step-three-images/step-three-image-1.jpg',
  // '/step-three-images/step-three-image-2.jpg',
  // '/step-three-images/step-three-image-3.jpg',
]

const PULL_TRANSITION_DURATION_MS = 1220
const TEXT_ENTRANCE_DURATION_MS = 860
const SLIDESHOW_START_DELAY_MS = 1000
const SLIDESHOW_INTERVAL_MS = 1050
const PHOTO_CROSSFADE_DURATION_MS = 420

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000
const RELATIONSHIP_START_AT = Date.parse('2026-05-25T21:00:00.000Z')

function addMonthsToStart(months) {
  const startLocal = new Date(RELATIONSHIP_START_AT + MOSCOW_OFFSET_MS)
  const absoluteMonth = startLocal.getUTCFullYear() * 12 + startLocal.getUTCMonth() + months
  const year = Math.floor(absoluteMonth / 12)
  const month = absoluteMonth - year * 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

  return new Date(Date.UTC(
    year,
    month,
    Math.min(startLocal.getUTCDate(), lastDay),
    startLocal.getUTCHours(),
    startLocal.getUTCMinutes(),
    startLocal.getUTCSeconds(),
    startLocal.getUTCMilliseconds(),
  ))
}

function getTotalElapsedMonths(timestamp) {
  const localNow = new Date(timestamp + MOSCOW_OFFSET_MS)
  const localStart = new Date(RELATIONSHIP_START_AT + MOSCOW_OFFSET_MS)
  let months =
    (localNow.getUTCFullYear() - localStart.getUTCFullYear()) * 12 +
    localNow.getUTCMonth() -
    localStart.getUTCMonth()

  if (addMonthsToStart(months).getTime() > localNow.getTime()) months -= 1
  return Math.max(0, months)
}

function getMonthForm(value) {
  const absoluteValue = Math.abs(Math.trunc(value))
  const lastTwoDigits = absoluteValue % 100
  const lastDigit = absoluteValue % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'месяцев'
  if (lastDigit === 1) return 'месяц'
  if (lastDigit >= 2 && lastDigit <= 4) return 'месяца'
  return 'месяцев'
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function ThirdStage({ onPrevious }) {
  const [isRevealed, setIsRevealed] = useState(false)
  const [isTextIntroComplete, setIsTextIntroComplete] = useState(false)
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false)
  const [hasChangedText, setHasChangedText] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const slideshowIndexRef = useRef(0)
  const [previousImageIndex, setPreviousImageIndex] = useState(null)
  const [failedImages, setFailedImages] = useState([])

  const elapsedMonths = useMemo(() => getTotalElapsedMonths(Date.now()), [])
  const activeImage = SLIDESHOW_IMAGES[activeImageIndex] ?? null
  const previousImage = previousImageIndex === null
    ? null
    : SLIDESHOW_IMAGES[previousImageIndex] ?? null

  useEffect(() => {
    const delay = prefersReducedMotion() ? 0 : PULL_TRANSITION_DURATION_MS
    const timeout = window.setTimeout(() => setIsRevealed(true), delay)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!isRevealed) return undefined

    const delay = prefersReducedMotion() ? 0 : TEXT_ENTRANCE_DURATION_MS
    const timeout = window.setTimeout(() => setIsTextIntroComplete(true), delay)
    return () => window.clearTimeout(timeout)
  }, [isRevealed])

  useEffect(() => {
    if (!isTextIntroComplete) return undefined

    const delay = prefersReducedMotion() ? 0 : SLIDESHOW_START_DELAY_MS
    const timeout = window.setTimeout(() => setIsSlideshowPlaying(true), delay)
    return () => window.clearTimeout(timeout)
  }, [isTextIntroComplete])

  useEffect(() => {
    if (!isSlideshowPlaying || SLIDESHOW_IMAGES.length < 2) return undefined

    const interval = window.setInterval(() => {
      const currentIndex = slideshowIndexRef.current
      const nextIndex = (currentIndex + 1) % SLIDESHOW_IMAGES.length
      setPreviousImageIndex(currentIndex)
      slideshowIndexRef.current = nextIndex
      setActiveImageIndex(nextIndex)
    }, SLIDESHOW_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isSlideshowPlaying])

  useEffect(() => {
    if (previousImageIndex === null) return undefined

    const timeout = window.setTimeout(
      () => setPreviousImageIndex(null),
      PHOTO_CROSSFADE_DURATION_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [previousImageIndex])

  const markImageAsFailed = (src) => {
    setFailedImages((current) => (
      current.includes(src) ? current : [...current, src]
    ))
  }

  const handleNext = () => {
    if (!isTextIntroComplete || hasChangedText) return
    setHasChangedText(true)
  }

  return (
    <main className={'stage-three' + (isRevealed ? ' stage-three--revealed' : '')}>
      <div className="stage-three__photo-stack" aria-hidden="true">
        {previousImage && !failedImages.includes(previousImage) && (
          <img
            key={'previous-' + previousImageIndex}
            className="stage-three__photo stage-three__photo--previous"
            src={previousImage}
            alt=""
            onError={() => markImageAsFailed(previousImage)}
          />
        )}
        {activeImage && !failedImages.includes(activeImage) && (
          <img
            key={'active-' + activeImageIndex}
            className="stage-three__photo stage-three__photo--active"
            src={activeImage}
            alt=""
            onError={() => markImageAsFailed(activeImage)}
          />
        )}
      </div>

      <div className="stage-three__dark-overlay" aria-hidden="true" />

      <div
        className={
          'stage-three__message-wrap' +
          (hasChangedText ? ' stage-three__message-wrap--corner' : '')
        }
        aria-live="polite"
      >
        <div
          className={
            'stage-three__message' +
            (isRevealed && !hasChangedText ? ' stage-three__message--intro' : '') +
            (hasChangedText ? ' stage-three__message--changed' : '')
          }
        >
          {hasChangedText ? (
            <>
              Хочу, чтобы ты тоже вспомнил <span className="stage-three__heart">❤️</span>
            </>
          ) : (
            <>
              За эти{' '}
              <span className="stage-three__highlight">
                {elapsedMonths} {getMonthForm(elapsedMonths)}
              </span>{' '}
              в моей жизни произошло больше, чем за последние 7–8 лет:
            </>
          )}
        </div>
      </div>

      {!isRevealed && (
        <div className="stage-three__pull-transition" aria-hidden="true">
          <div className="stage-three__pull-curtain">
            <div className="stage-three__curtain-fold" />
            <div className="stage-three__thread" />
            <img
              className="stage-three__puller"
              src="/step-three-assets/pixel-self-pulling.png"
              alt=""
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden'
              }}
            />
          </div>
        </div>
      )}

      <StageControls
        onPrevious={onPrevious}
        onNext={handleNext}
        previousDisabled={!isRevealed}
        nextDisabled={!isTextIntroComplete || hasChangedText}
      />
    </main>
  )
}
