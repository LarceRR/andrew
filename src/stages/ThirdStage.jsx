import { useEffect, useMemo, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import './ThirdStage.css'

const SLIDESHOW_IMAGES = [
  '/step-three-images/step-three-image-1.jpg',
  '/step-three-images/step-three-image-2.jpg',
  '/step-three-images/step-three-image-3.jpg',
  '/step-three-images/step-three-image-4.jpg',
  '/step-three-images/step-three-image-5.jpg',
  '/step-three-images/step-three-image-6.jpg',
  '/step-three-images/step-three-image-7.jpg',
  '/step-three-images/step-three-image-8.jpg',
  '/step-three-images/step-three-image-9.jpg',
  '/step-three-images/step-three-image-10.jpg',
  '/step-three-images/step-three-image-11.jpg',
  '/step-three-images/step-three-image-12.jpg',
]

const TEXT_ENTRANCE_DURATION_MS = 860
const SLIDESHOW_START_DELAY_MS = 1000
const SLIDESHOW_INTERVAL_MS = 820
const PHOTO_CROSSFADE_DURATION_MS = 300

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
  const isRevealed = true
  const [isTextIntroComplete, setIsTextIntroComplete] = useState(false)
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false)
  const [hasChangedText, setHasChangedText] = useState(false)
  const [availableImages, setAvailableImages] = useState([])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const slideshowIndexRef = useRef(0)
  const [previousImageIndex, setPreviousImageIndex] = useState(null)

  const elapsedMonths = useMemo(() => getTotalElapsedMonths(Date.now()), [])
  const activeImage = availableImages[activeImageIndex] ?? null
  const previousImage = previousImageIndex === null
    ? null
    : availableImages[previousImageIndex] ?? null

  useEffect(() => {
    let cancelled = false
    let finished = 0
    const loaded = []

    if (SLIDESHOW_IMAGES.length === 0) {
      setAvailableImages([])
      return undefined
    }

    // Decode all configured images before revealing the slideshow. This warms
    // the browser cache and prevents a blank frame between slides.
    SLIDESHOW_IMAGES.forEach((src) => {
      const image = new Image()
      const settle = (isAvailable) => {
        if (cancelled) return
        if (isAvailable) loaded.push(src)
        finished += 1
        if (finished === SLIDESHOW_IMAGES.length) {
          setAvailableImages(loaded)
          slideshowIndexRef.current = 0
          setActiveImageIndex(0)
        }
      }
      image.onload = () => {
        if (typeof image.decode === 'function') {
          image.decode().catch(() => {}).finally(() => settle(true))
        } else {
          settle(true)
        }
      }
      image.onerror = () => settle(false)
      image.src = src
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isRevealed) return undefined

    const delay = prefersReducedMotion() ? 0 : TEXT_ENTRANCE_DURATION_MS
    const timeout = window.setTimeout(() => setIsTextIntroComplete(true), delay)
    return () => window.clearTimeout(timeout)
  }, [isRevealed])

  useEffect(() => {
    if (!isTextIntroComplete || availableImages.length === 0) return undefined

    const delay = prefersReducedMotion() ? 0 : SLIDESHOW_START_DELAY_MS
    const timeout = window.setTimeout(() => setIsSlideshowPlaying(true), delay)
    return () => window.clearTimeout(timeout)
  }, [isTextIntroComplete, availableImages])

  useEffect(() => {
    if (!isSlideshowPlaying || availableImages.length < 2) return undefined

    const interval = window.setInterval(() => {
      const currentIndex = slideshowIndexRef.current
      const nextIndex = (currentIndex + 1) % availableImages.length
      setPreviousImageIndex(currentIndex)
      slideshowIndexRef.current = nextIndex
      setActiveImageIndex(nextIndex)
    }, SLIDESHOW_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isSlideshowPlaying, availableImages])

  useEffect(() => {
    if (previousImageIndex === null) return undefined

    // Keep the old frame behind the incoming one slightly longer than the fade
    // to avoid exposing the stack background due to frame/timer scheduling.
    const timeout = window.setTimeout(
      () => setPreviousImageIndex(null),
      PHOTO_CROSSFADE_DURATION_MS + 60,
    )
    return () => window.clearTimeout(timeout)
  }, [previousImageIndex])

  const handleNext = () => {
    if (!isTextIntroComplete || hasChangedText) return
    setHasChangedText(true)
  }

  return (
    <main
      className={
        'stage-three' +
        (isRevealed ? ' stage-three--revealed' : '') +
        (isSlideshowPlaying ? ' stage-three--slideshow-playing' : '')
      }
    >
      <div className="stage-three__photo-stack" aria-hidden="true">
        {previousImage && (
          <img
            key={'previous-' + previousImageIndex}
            className="stage-three__photo stage-three__photo--previous"
            src={previousImage}
            alt=""
          />
        )}
        {activeImage && (
          <img
            key={'active-' + activeImageIndex}
            className="stage-three__photo stage-three__photo--active"
            src={activeImage}
            alt=""
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

      <StageControls
        onPrevious={onPrevious}
        onNext={handleNext}
        previousDisabled={!isRevealed}
        nextDisabled={!isTextIntroComplete || hasChangedText}
      />
    </main>
  )
}
