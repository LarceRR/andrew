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
const MESSAGE_OUT_DURATION_MS = 220
const MESSAGE_SWITCH_GAP_MS = 60
const MESSAGE_IN_DURATION_MS = 460
const SLIDESHOW_INTERVAL_MS = 1020
const PHOTO_CROSSFADE_DURATION_MS = 370

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
  const [messageIndex, setMessageIndex] = useState(null)
  const [messageAnimation, setMessageAnimation] = useState('none')
  const [messageTextHidden, setMessageTextHidden] = useState(false)
  const messageIndexRef = useRef(null)
  const messageTransitionRef = useRef(false)
  const messageTimersRef = useRef([])
  const hasChangedText = messageIndex !== null
  const availableMessages = [
    <>Хочу, чтобы ты тоже вспомнил <span className="stage-three__heart">❤️</span></>,
    <>Каждый момент на этих фотографиях я до сих пор отчётливо помню </>,
    <>И каждый из них вызывает у меня два приятных чувства:</>,
    <>Ностальгия, и…</>,
    <>Эрекция 😏</>,
    <>Шучу :)</>,
    <>
      Второе чувство — это{' '}
      <span className="stage-three__warmth">
        тепло
        <span className="stage-three__sparks" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => (
            <span className={'stage-three__spark stage-three__spark--' + index} key={index} />
          ))}
        </span>
      </span>
      .
    </>,
    <>Ну ладно, эрекция тоже, учитывая нашу переписку 😹</>,
  ]
  const [availableImages, setAvailableImages] = useState([])
  const [photoLayers, setPhotoLayers] = useState([null, null])
  const [visiblePhotoLayer, setVisiblePhotoLayer] = useState(0)
  const [photoCrossfade, setPhotoCrossfade] = useState(null)
  const [pendingPhoto, setPendingPhoto] = useState(null)
  const photoLayerRefs = useRef([null, null])
  const visiblePhotoLayerRef = useRef(0)
  const crossfadeActiveRef = useRef(false)
  const photoTransitionTokenRef = useRef(0)
  const slideshowIndexRef = useRef(0)

  const elapsedMonths = useMemo(() => getTotalElapsedMonths(Date.now()), [])

  useEffect(() => {
    let cancelled = false
    let finished = 0
    const loaded = new Array(SLIDESHOW_IMAGES.length)

    if (SLIDESHOW_IMAGES.length === 0) {
      setAvailableImages([])
      setPhotoLayers([null, null])
      return undefined
    }

    // Decode every photo before the slideshow starts. Store results by their
    // configured index so download timing can never scramble the slide order.
    SLIDESHOW_IMAGES.forEach((src, index) => {
      const image = new Image()
      const settle = (isAvailable) => {
        if (cancelled) return
        if (isAvailable) loaded[index] = src
        finished += 1

        if (finished === SLIDESHOW_IMAGES.length) {
          const available = loaded.filter(Boolean)
          setAvailableImages(available)
          slideshowIndexRef.current = 0

          const initialLayers = [available[0] ?? null, available[1] ?? available[0] ?? null]
          setPhotoLayers(initialLayers)
          setVisiblePhotoLayer(0)
          visiblePhotoLayerRef.current = 0
          setPhotoCrossfade(null)
          setPendingPhoto(null)
          crossfadeActiveRef.current = false
        }
      }

      image.onload = async () => {
        try {
          if (typeof image.decode === 'function') await image.decode()
          settle(true)
        } catch {
          // Some browsers reject decode() despite a usable decoded image.
          settle(image.naturalWidth > 0)
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
    if (!isSlideshowPlaying || availableImages.length < 2) return undefined

    const interval = window.setInterval(() => {
      // Never start a second transition while the incoming layer is loading
      // or while the current crossfade is still running.
      if (crossfadeActiveRef.current) return

      const nextIndex = (slideshowIndexRef.current + 1) % availableImages.length
      const incomingLayer = 1 - visiblePhotoLayerRef.current
      const token = photoTransitionTokenRef.current + 1
      photoTransitionTokenRef.current = token
      crossfadeActiveRef.current = true

      setPhotoLayers((current) => {
        const next = [...current]
        next[incomingLayer] = availableImages[nextIndex]
        return next
      })
      setPendingPhoto({ slot: incomingLayer, nextIndex, token })
    }, SLIDESHOW_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isSlideshowPlaying, availableImages])

  useEffect(() => {
    if (!pendingPhoto) return undefined

    const { slot, nextIndex, token } = pendingPhoto
    const image = photoLayerRefs.current[slot]
    let cancelled = false

    const prepareIncomingPhoto = async () => {
      if (!image) {
        crossfadeActiveRef.current = false
        setPendingPhoto(null)
        return
      }

      try {
        if (typeof image.decode === 'function') {
          await image.decode()
        } else if (!image.complete) {
          await new Promise((resolve, reject) => {
            const handleLoad = () => {
              cleanup()
              resolve()
            }
            const handleError = () => {
              cleanup()
              reject(new Error('Unable to load slideshow image'))
            }
            const cleanup = () => {
              image.removeEventListener('load', handleLoad)
              image.removeEventListener('error', handleError)
            }
            image.addEventListener('load', handleLoad, { once: true })
            image.addEventListener('error', handleError, { once: true })
          })
        }
      } catch {
        if (!image.complete || image.naturalWidth === 0) {
          if (!cancelled && token === photoTransitionTokenRef.current) {
            crossfadeActiveRef.current = false
            setPendingPhoto(null)
          }
          return
        }
      }

      if (cancelled || token !== photoTransitionTokenRef.current) return

      slideshowIndexRef.current = nextIndex
      setPendingPhoto((current) => (current?.token === token ? null : current))

      if (prefersReducedMotion()) {
        visiblePhotoLayerRef.current = slot
        setVisiblePhotoLayer(slot)
        setPhotoCrossfade(null)
        crossfadeActiveRef.current = false
        return
      }

      setPhotoCrossfade({
        from: visiblePhotoLayerRef.current,
        to: slot,
        token,
      })
    }

    prepareIncomingPhoto()
    return () => {
      cancelled = true
    }
  }, [pendingPhoto])

  const clearMessageTimers = () => {
    messageTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    messageTimersRef.current = []
  }

  useEffect(() => () => clearMessageTimers(), [])

  const handleNext = () => {
    if (!isTextIntroComplete || messageTransitionRef.current) return

    // First click reveals the first line and starts the already-preloaded slideshow.
    if (messageIndexRef.current === null) {
      messageIndexRef.current = 0
      setMessageIndex(0)
      setMessageAnimation('in')
      setIsSlideshowPlaying(true)
      return
    }

    if (messageIndexRef.current >= availableMessages.length - 1) return

    messageTransitionRef.current = true
    clearMessageTimers()
    setMessageAnimation('out')

    // Blur out, let the line fully disappear, then bring the next one in.
    messageTimersRef.current.push(window.setTimeout(() => {
      setMessageTextHidden(true)
      messageTimersRef.current.push(window.setTimeout(() => {
        const nextIndex = messageIndexRef.current + 1
        messageIndexRef.current = nextIndex
        setMessageIndex(nextIndex)
        setMessageTextHidden(false)
        setMessageAnimation('in')

        messageTimersRef.current.push(window.setTimeout(() => {
          setMessageAnimation('none')
          messageTransitionRef.current = false
        }, prefersReducedMotion() ? 0 : MESSAGE_IN_DURATION_MS))
      }, prefersReducedMotion() ? 0 : MESSAGE_SWITCH_GAP_MS))
    }, prefersReducedMotion() ? 0 : MESSAGE_OUT_DURATION_MS))
  }

  return (
    <main
      className={
        'stage-three' +
        (isRevealed ? ' stage-three--revealed' : '') +
        (isSlideshowPlaying ? ' stage-three--slideshow-playing' : '')
      }
      style={{ '--photo-crossfade-duration': PHOTO_CROSSFADE_DURATION_MS + 'ms' }}
    >
      <div className="stage-three__photo-stack" aria-hidden="true">
        {photoLayers.map((src, layerIndex) => {
          if (!src) return null

          const isIncomingLayer = photoCrossfade?.to === layerIndex
          const opacity = photoCrossfade
            ? (isIncomingLayer ? 1 : 0)
            : (visiblePhotoLayer === layerIndex ? 1 : 0)
          const zIndex = photoCrossfade
            ? (isIncomingLayer ? 2 : 1)
            : (visiblePhotoLayer === layerIndex ? 2 : 1)

          return (
            <img
              key={'photo-layer-' + layerIndex}
              ref={(element) => {
                photoLayerRefs.current[layerIndex] = element
              }}
              className="stage-three__photo"
              src={src}
              alt=""
              style={{ opacity, zIndex }}
              onTransitionEnd={(event) => {
                if (
                  event.target !== event.currentTarget ||
                  event.propertyName !== 'opacity' ||
                  !photoCrossfade ||
                  photoCrossfade.to !== layerIndex ||
                  photoCrossfade.token !== photoTransitionTokenRef.current
                ) {
                  return
                }

                visiblePhotoLayerRef.current = layerIndex
                setVisiblePhotoLayer(layerIndex)
                setPhotoCrossfade(null)
                crossfadeActiveRef.current = false
              }}
            />
          )
        })}
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
            (hasChangedText ? ' stage-three__message--changed' : '') +
            (messageIndex === availableMessages.length - 1 ? ' stage-three__message--last-caption' : '') +
            (messageAnimation === 'out' ? ' stage-three__message--blur-out' : '') +
            (messageAnimation === 'in' ? ' stage-three__message--blur-in' : '') +
            (messageTextHidden ? ' stage-three__message--hidden' : '')
          }
        >
          {hasChangedText ? availableMessages[messageIndex] : (
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
        nextDisabled={!isTextIntroComplete || messageTransitionRef.current || messageIndex === availableMessages.length - 1}
      />
    </main>
  )
}
