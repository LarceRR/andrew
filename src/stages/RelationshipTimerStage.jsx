import { useEffect, useMemo, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import './RelationshipTimerStage.css'

const BACKGROUND = '#F4A6C1'
const TEXT_COLOR = '#000000'
const NUMBER_COLOR = '#155E3D'
const FONT_FAMILY = 'Impact, "Arial Narrow", "Arial Black", sans-serif'
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000
const START_AT = Date.parse('2026-05-25T21:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const HEADING_TRANSITION_DURATION = 640
const NUMBER_TRANSITION_DURATION = 1650
const INTRO_DURATION = 2450
const INTRO_TICK_INTERVAL = 45
const ROLL_DURATION_START_MS = 42
const ROLL_DURATION_END_MS = 125
const MAX_FONT_SIZE = 92
const MIN_FONT_SIZE = 48

const HISTORY_HEADINGS = ['Мы начали нашу', 'историю:']
const FUTURE_HEADINGS = ['Но я надеюсь,', 'что мы с тобой', 'будем вместе еще:']
const UNIT_ROWS = [
  { key: 'years', label: 'лет' },
  { key: 'months', label: 'месяцев' },
  { key: 'days', label: 'дней' },
  { key: 'hours', label: 'часов' },
  { key: 'minutes', label: 'минут' },
  { key: 'seconds', label: 'секунд' },
]
const HISTORY_KEYS = ['months', 'days', 'hours', 'minutes', 'seconds']
const FUTURE_VALUE = 999

const clamp = (value) => Math.max(0, Math.min(1, value))
const lerp = (from, to, progress) => from + (to - from) * progress
let measureContext = null

function getMeasureContext() {
  if (typeof document === 'undefined') return null
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d')
  }
  return measureContext
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value), 3)
}

function addMonthsToStart(months) {
  const startLocal = new Date(START_AT + MOSCOW_OFFSET_MS)
  const absoluteMonth = startLocal.getUTCFullYear() * 12 + startLocal.getUTCMonth() + months
  const year = Math.floor(absoluteMonth / 12)
  const month = absoluteMonth - year * 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(startLocal.getUTCDate(), lastDay)

  return new Date(Date.UTC(
    year,
    month,
    day,
    startLocal.getUTCHours(),
    startLocal.getUTCMinutes(),
    startLocal.getUTCSeconds(),
    startLocal.getUTCMilliseconds(),
  ))
}

function getElapsedParts(timestamp) {
  if (timestamp <= START_AT) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  // Fixed Moscow time makes the result consistent across devices and time zones.
  const localNow = new Date(timestamp + MOSCOW_OFFSET_MS)
  const localStart = new Date(START_AT + MOSCOW_OFFSET_MS)
  let months =
    (localNow.getUTCFullYear() - localStart.getUTCFullYear()) * 12 +
    localNow.getUTCMonth() -
    localStart.getUTCMonth()

  let monthAnchor = addMonthsToStart(months)
  if (monthAnchor.getTime() > localNow.getTime()) {
    months -= 1
    monthAnchor = addMonthsToStart(months)
  }

  let remainder = Math.max(0, localNow.getTime() - monthAnchor.getTime())
  const days = Math.floor(remainder / DAY_MS)
  remainder -= days * DAY_MS
  const hours = Math.floor(remainder / (60 * 60 * 1000))
  remainder -= hours * 60 * 60 * 1000
  const minutes = Math.floor(remainder / (60 * 1000))
  remainder -= minutes * 60 * 1000
  const seconds = Math.floor(remainder / 1000)

  return { years: 0, months, days, hours, minutes, seconds }
}

function measureWidthAtOnePx(context, text) {
  context.font = '900 1px ' + FONT_FAMILY
  const width = context.measureText(text).width
  const letterSpacingReduction = Math.max(0, text.length - 1) * 0.055
  return Math.max(1, width - letterSpacingReduction)
}

function createTypography(width, height) {
  const context = getMeasureContext()
  const availableWidth = Math.max(1, width - 24)
  const availableHeight = Math.max(1, height - 36)

  if (!context) {
    return {
      headingSize: 48,
      valueSize: 48,
      headingLineHeight: 44,
      valueLineHeight: 42,
      availableWidth,
    }
  }

  const headingWidth = measureWidthAtOnePx(context, 'будем вместе еще:')
  const valueWidth = measureWidthAtOnePx(context, '999 месяцев')

  let headingSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, availableWidth / headingWidth))
  let valueSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, availableWidth / valueWidth))

  const estimatedHeight = headingSize * 0.91 * 3 + valueSize * 0.88 * 6 + 16

  if (estimatedHeight > availableHeight) {
    const scale = availableHeight / estimatedHeight
    headingSize = Math.max(42, headingSize * scale)
    valueSize = Math.max(42, valueSize * scale)
  }

  return {
    headingSize,
    valueSize,
    headingLineHeight: headingSize * 0.91,
    valueLineHeight: valueSize * 0.88,
    availableWidth,
  }
}

function getHorizontalScale(text, fontSize, availableWidth, extraWidthEm = 0) {
  const context = getMeasureContext()
  if (!context) return 1

  context.font = '900 ' + fontSize + 'px ' + FONT_FAMILY
  const measuredWidth =
    context.measureText(text).width -
    Math.max(0, text.length - 1) * fontSize * 0.055

  return Math.min(1, availableWidth / Math.max(1, measuredWidth + fontSize * extraWidthEm))
}

function RollingDigit({ digit, direction, duration = ROLL_DURATION_START_MS }) {
  const currentDigit = String(digit)
  const [roll, setRoll] = useState({
    current: currentDigit,
    previous: null,
    direction,
    sequence: 0,
  })
  const lastDigitRef = useRef(currentDigit)
  const directionRef = useRef(direction)
  const timeoutRef = useRef(null)
  directionRef.current = direction

  useEffect(() => {
    const nextDigit = String(digit)
    const previousDigit = lastDigitRef.current
    if (nextDigit === previousDigit) return

    lastDigitRef.current = nextDigit
    setRoll((current) => ({
      current: nextDigit,
      previous: previousDigit,
      direction: directionRef.current,
      sequence: current.sequence + 1,
    }))

    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      setRoll((current) => (
        current.current === nextDigit
          ? { ...current, previous: null }
          : current
      ))
      timeoutRef.current = null
    }, duration)
  }, [digit, duration])

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  return (
    <span
      className={
        'relationship-timer__digit' +
        (roll.previous !== null ? ' relationship-timer__digit--' + roll.direction : '')
      }
      style={{ '--roll-duration': duration + 'ms' }}
      aria-hidden="true"
    >
      {roll.previous !== null && (
        <span
          key={roll.sequence + '-old'}
          className={
            'relationship-timer__digit-face relationship-timer__digit-old' +
            ' relationship-timer__digit-old--' + roll.direction
          }
        >
          {roll.previous}
        </span>
      )}
      <span
        key={roll.sequence + '-current'}
        className={
          'relationship-timer__digit-face relationship-timer__digit-current' +
          (roll.previous !== null ? ' relationship-timer__digit-current--' + roll.direction : '')
        }
      >
        {roll.current}
      </span>
    </span>
  )
}

function RollingNumber({ value, fontSize, rollDuration }) {
  const safeValue = Math.max(0, Math.floor(value))
  const previousValueRef = useRef(safeValue)
  const direction = safeValue >= previousValueRef.current ? 'up' : 'down'
  const digits = String(safeValue).split('')

  useEffect(() => {
    previousValueRef.current = safeValue
  }, [safeValue])

  return (
    <span className="relationship-timer__number" style={{ fontSize }} aria-label={String(safeValue)}>
      {digits.map((digit, index) => (
        <RollingDigit
          key={digits.length - index - 1}
          digit={digit}
          direction={direction}
          duration={rollDuration}
        />
      ))}
    </span>
  )
}

function MetricRow({ unit, value, fontSize, lineHeight, width, extraClass = '', introDelay = '0ms', rollDuration = ROLL_DURATION_START_MS }) {
  const text = String(value) + ' ' + unit.label
  const scale = getHorizontalScale(text, fontSize, width, 0.62)

  return (
    <div
      className={'relationship-timer__metric ' + extraClass}
      style={{
        height: lineHeight,
        lineHeight: lineHeight + 'px',
        fontSize,
        '--metric-scale': scale,
        '--metric-delay': introDelay,
      }}
      aria-label={String(value) + ' ' + unit.label}
    >
      <span className="relationship-timer__metric-content">
        <RollingNumber value={value} fontSize={fontSize} rollDuration={rollDuration} />
        <span className="relationship-timer__unit">{unit.label}</span>
      </span>
    </div>
  )
}

export default function RelationshipTimerStage({ onPrevious }) {
  const stageRef = useRef(null)
  const rafRef = useRef(0)
  const headingRafRef = useRef(0)
  const transitionRunningRef = useRef(false)
  const modeRef = useRef('history')
  const transitionStartPartsRef = useRef(null)
  const introTargetPartsRef = useRef({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [viewport, setViewport] = useState({ width: 390, height: 844 })
  const [mode, setMode] = useState('history')
  const [introProgress, setIntroProgress] = useState(0)
  const [introComplete, setIntroComplete] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [headingProgress, setHeadingProgress] = useState(null)
  const [numberProgress, setNumberProgress] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const typography = useMemo(
    () => createTypography(viewport.width, viewport.height),
    [viewport.width, viewport.height],
  )

  useEffect(() => {
    const element = stageRef.current
    if (!element) return undefined

    const updateSize = () => {
      const rect = element.getBoundingClientRect()
      setViewport({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    window.addEventListener('resize', updateSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [])

  useEffect(() => {
    const targetTime = Date.now()
    introTargetPartsRef.current = getElapsedParts(targetTime)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIntroProgress(1)
      setIntroComplete(true)
      setNow(Date.now())
      return undefined
    }

    const startedAt = performance.now()
    let lastPublishedAt = 0
    let alive = true

    const tick = (timestamp) => {
      if (!alive) return
      const progress = clamp((timestamp - startedAt) / INTRO_DURATION)

      if (timestamp - lastPublishedAt >= INTRO_TICK_INTERVAL || progress >= 1) {
        setIntroProgress(progress)
        lastPublishedAt = timestamp
      }

      if (progress >= 1) {
        setIntroComplete(true)
        setNow(Date.now())
        return
      }

      rafRef.current = window.requestAnimationFrame(tick)
    }

    rafRef.current = window.requestAnimationFrame(tick)
    return () => {
      alive = false
      window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!introComplete || mode !== 'history' || isTransitioning) return undefined

    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [introComplete, mode, isTransitioning])

  const actualParts = useMemo(() => getElapsedParts(now), [now])
  const headingPathProgress = headingProgress !== null
    ? headingProgress
    : mode === 'future'
      ? 1
      : 0
  const headingMotionProgress = easeOutCubic(headingPathProgress)
  const numericMotionProgress = numberProgress !== null
    ? numberProgress
    : mode === 'future'
      ? 1
      : 0
  const rollDuration = Math.round(
    lerp(ROLL_DURATION_START_MS, ROLL_DURATION_END_MS, easeOutCubic(numericMotionProgress)),
  )

  let displayedValues
  if (numberProgress !== null) {
    const source = transitionStartPartsRef.current ?? actualParts
    const eased = easeOutCubic(numberProgress)
    displayedValues = Object.fromEntries(
      UNIT_ROWS.map(({ key }) => [
        key,
        Math.round(lerp(source[key] ?? 0, FUTURE_VALUE, eased)),
      ]),
    )
  } else if (mode === 'future') {
    displayedValues = Object.fromEntries(UNIT_ROWS.map(({ key }) => [key, FUTURE_VALUE]))
  } else if (!introComplete) {
    const eased = easeOutCubic(introProgress)
    displayedValues = Object.fromEntries(
      UNIT_ROWS.map(({ key }) => [
        key,
        Math.floor((introTargetPartsRef.current[key] ?? 0) * eased),
      ]),
    )
  } else {
    displayedValues = actualParts
  }

  const startTransition = (direction) => {
    if (!introComplete || transitionRunningRef.current) return
    if (direction === 1 && modeRef.current !== 'history') return
    if (direction === -1 && modeRef.current !== 'future') return

    if (direction === 1) {
      const snapshotTime = Date.now()
      setNow(snapshotTime)
      transitionStartPartsRef.current = getElapsedParts(snapshotTime)
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const nextMode = direction === 1 ? 'future' : 'history'
      modeRef.current = nextMode
      setMode(nextMode)
      setHeadingProgress(null)
      setNumberProgress(null)
      return
    }

    if (!transitionStartPartsRef.current) {
      transitionStartPartsRef.current = getElapsedParts(Date.now())
    }

    transitionRunningRef.current = true
    setIsTransitioning(true)
    setHeadingProgress(direction === 1 ? 0 : 1)
    setNumberProgress(direction === 1 ? 0 : 1)

    const startedAt = performance.now()
    let lastNumberPublishAt = startedAt

    // The heading runs on its own frame loop and finishes independently.
    const animateHeading = (timestamp) => {
      const elapsed = Math.max(0, (timestamp - startedAt) / 1000)
      const progress = elapsed / (HEADING_TRANSITION_DURATION / 1000)
      const nextProgress = direction === 1 ? clamp(progress) : clamp(1 - progress)
      setHeadingProgress(nextProgress)

      const unfinished = direction === 1 ? nextProgress < 1 : nextProgress > 0
      if (unfinished) {
        headingRafRef.current = window.requestAnimationFrame(animateHeading)
      }
    }

    // Numbers use a separate, faster curve with a long ease-out at the destination.
    const animateNumbers = (timestamp) => {
      const elapsed = Math.max(0, (timestamp - startedAt) / 1000)
      const progress = elapsed / (NUMBER_TRANSITION_DURATION / 1000)
      const nextProgress = direction === 1 ? clamp(progress) : clamp(1 - progress)

      if (
        timestamp - lastNumberPublishAt >= 24 ||
        (direction === 1 && nextProgress >= 1) ||
        (direction === -1 && nextProgress <= 0)
      ) {
        setNumberProgress(nextProgress)
        lastNumberPublishAt = timestamp
      }

      if (direction === 1 && nextProgress >= 1) {
        modeRef.current = 'future'
        setMode('future')
        setHeadingProgress(null)
        setNumberProgress(null)
        setIsTransitioning(false)
        transitionRunningRef.current = false
        return
      }

      if (direction === -1 && nextProgress <= 0) {
        modeRef.current = 'history'
        setMode('history')
        setHeadingProgress(null)
        setNumberProgress(null)
        setIsTransitioning(false)
        transitionRunningRef.current = false
        setNow(Date.now())
        return
      }

      rafRef.current = window.requestAnimationFrame(animateNumbers)
    }

    headingRafRef.current = window.requestAnimationFrame(animateHeading)
    rafRef.current = window.requestAnimationFrame(animateNumbers)
  }

  const handlePrevious = () => {
    if (!introComplete || isTransitioning) return
    if (modeRef.current === 'future') {
      startTransition(-1)
      return
    }
    onPrevious?.()
  }

  const handleNext = () => {
    if (!introComplete || isTransitioning) return
    if (modeRef.current === 'history') startTransition(1)
  }

  useEffect(() => () => {
    window.cancelAnimationFrame(rafRef.current)
    window.cancelAnimationFrame(headingRafRef.current)
  }, [])

  const headingHistoryOpacity = 1 - headingMotionProgress
  const headingFutureOpacity = headingMotionProgress
  const headingHeight = typography.headingLineHeight * (2 + headingMotionProgress)
  const historyTranslateY = -10 * headingMotionProgress
  const futureTranslateY = 10 * (1 - headingMotionProgress)
  const yearRowHeight = typography.valueLineHeight * headingMotionProgress
  const entering = !introComplete
  const historyLines = HISTORY_HEADINGS.map((line, index) => (
    <div
      className="relationship-timer__heading-line"
      key={line}
      style={{
        height: typography.headingLineHeight,
        lineHeight: typography.headingLineHeight + 'px',
        fontSize: typography.headingSize,
        transform: 'scaleX(' + getHorizontalScale(line, typography.headingSize, typography.availableWidth) + ')',
        '--intro-delay': (index * 130) + 'ms',
      }}
    >
      {line}
    </div>
  ))
  const futureLines = FUTURE_HEADINGS.map((line) => (
    <div
      className="relationship-timer__heading-line"
      key={line}
      style={{
        height: typography.headingLineHeight,
        lineHeight: typography.headingLineHeight + 'px',
        fontSize: typography.headingSize,
        transform: 'scaleX(' + getHorizontalScale(line, typography.headingSize, typography.availableWidth) + ')',
      }}
    >
      {line}
    </div>
  ))

  return (
    <main
      ref={stageRef}
      className={
        'relationship-timer' +
        (entering ? ' relationship-timer--intro' : '') +
        (mode === 'future' ? ' relationship-timer--future' : '')
      }
      style={{
        '--background-color': BACKGROUND,
        '--text-color': TEXT_COLOR,
        '--number-color': NUMBER_COLOR,
      }}
    >
      <div className="relationship-timer__content">
        <section
          className="relationship-timer__headings"
          style={{ height: headingHeight }}
          aria-live="polite"
        >
          <div
            className="relationship-timer__heading-layer relationship-timer__heading-layer--history"
            style={{
              opacity: headingHistoryOpacity,
              transform: 'translateY(' + historyTranslateY + 'px)',
            }}
            aria-hidden={headingMotionProgress > 0.98}
          >
            {historyLines}
          </div>
          <div
            className="relationship-timer__heading-layer relationship-timer__heading-layer--future"
            style={{
              opacity: headingFutureOpacity,
              transform: 'translateY(' + futureTranslateY + 'px)',
            }}
            aria-hidden={headingMotionProgress < 0.02}
          >
            {futureLines}
          </div>
        </section>

        <section
          className="relationship-timer__metrics"
          style={{ marginTop: typography.valueSize * 0.1 }}
          aria-live="polite"
        >
          <div
            className="relationship-timer__year-slot"
            style={{
              height: yearRowHeight,
              opacity: headingMotionProgress,
              marginBottom: yearRowHeight > 0 ? typography.valueLineHeight * 0.04 : 0,
            }}
            aria-hidden={headingMotionProgress < 0.01}
          >
            <MetricRow
              unit={UNIT_ROWS[0]}
              value={displayedValues.years ?? 0}
              fontSize={typography.valueSize}
              lineHeight={typography.valueLineHeight}
              width={typography.availableWidth}
              rollDuration={rollDuration}
              extraClass="relationship-timer__metric--years"
            />
          </div>

          {HISTORY_KEYS.map((key, index) => {
            const unit = UNIT_ROWS.find((row) => row.key === key)
            return (
              <MetricRow
                key={key}
                unit={unit}
                value={displayedValues[key] ?? 0}
                fontSize={typography.valueSize}
                lineHeight={typography.valueLineHeight}
                width={typography.availableWidth}
                introDelay={(540 + index * 100) + 'ms'}
                rollDuration={rollDuration}
                extraClass={'relationship-timer__metric--history relationship-timer__metric--index-' + index}
              />
            )
          })}
        </section>
      </div>

      <StageControls
        onPrevious={handlePrevious}
        onNext={handleNext}
        previousDisabled={!introComplete || isTransitioning}
        nextDisabled={!introComplete || isTransitioning || mode === 'future'}
      />
    </main>
  )
}
