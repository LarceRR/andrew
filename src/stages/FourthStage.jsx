import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StageControls from '../components/StageControls.jsx'
import TextGlitchCanvas from './TextGlitchCanvas.jsx'
import './FourthStage.css'

const STAR_COUNT = 94
const INITIAL_PAUSE_MS = 1500
const FIRST_TEXT_DELAY_MS = 340
const TYPEWRITER_INTERVAL_MS = 52
const NEXT_TEXT_DELAY_MS = 90
const IMAGE_RISE_DISTANCE_PERCENT = 30
const IMAGE_RISE_DURATION_MS = 1200

const TARGETING_DURATION_MS = 1350
const TRAVEL_DURATION_MS = 5000
const BLACKOUT_DURATION_MS = 950
const REVEAL_DURATION_MS = 1750
const REUNION_FADE_DURATION_MS = 760
const REUNION_STARS_REVEAL_MS = 950
const REUNION_APPROACH_DURATION_MS = 3800
const REUNION_STARS_RETURN_MS = 1050
const MAX_TRAVEL_DISTANCE_KM = 12_800_000

// Сценарий четвёртого этапа: текст, картинка, стиль и действия хранятся вместе.
// Чтобы добавить перелёт, добавь объект с action: 'star-travel' в нужное место.
// Несколько шагов star-travel подряд автоматически запустят несколько перелётов.
const STORY_STEPS = [
  {
    kind: 'dialogue',
    speaker: 'ruslan',
    text: '- Что за хрень?',
    image: '/step-four-assets/rus-shocked.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f', transform: 'translateY(-20px)' },
  },
  {
    kind: 'dialogue',
    speaker: 'ruslan',
    text: '- Как я сюда попал?',
    image: '/step-four-assets/rus-confused.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f' },
  },
  {
    kind: 'dialogue',
    speaker: 'ruslan',
    text: '- Джарвис, ты меня слышишь? Где Андрей?',
    image: '/step-four-assets/rus-asking-ajax.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f', transform: 'translateY(-20px)' },
  },
  {
    kind: 'dialogue',
    speaker: 'jarvis',
    text: '- Датчики фиксируют, что Андрей находится в 12.8 миллионах километров от вас.',
    image: '/step-four-assets/ajax-answering-rus.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'dialogue',
    speaker: 'ruslan',
    text: '- Ахринеть, как-то это далековато. . . Надо отправить сообщение.',
    image: '/step-four-assets/rus-turned-around.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f', transform: 'translateY(-20px)' },
  },
  {
    kind: 'dialogue',
    speaker: 'ruslan',
    text: '- Дорогой, я на спутнике какой-то неизвестной планеты. \n Я не знаю, как сюда попал. Джарвис обнаружил твой сигнал и твои координаты. \n Я выдвигаюсь к тебе.',
    image: '/step-four-assets/rus-turned-around-ajax.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#ff9696', marginBottom: '120px', },
  },
  {
    kind: 'action',
    action: 'star-travel',
    text: `Тем временем, где-то за три звезды...`,
    image: null,
    textStyle: { fontSize: '18px', color: '#d8e8ff' },
  },
  {
    kind: 'arrival',
    speaker: 'andrey',
    text: '- За-яя!!! Ты где?',
    typeAfterImageArrival: true,
    image: '/step-four-assets/and-first-show.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#71afff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'andrey',
    text: '- Входящее сообщение от "Руслан"',
    image: '/step-four-assets/and-incomming-message.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'andrey',
    text: '- Дорогой, я на спутнике какой-то неизвестной планеты. \n Я не знаю, как сюда попал. Джарвис обнаружил твой сигнал и твои координаты. \n Я выдвигаюсь к тебе.',
    image: '/step-four-assets/and-incomming-message.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff', marginBottom: '120px' },
  },
  {
    kind: 'arrival',
    speaker: 'andrey',
    text: '- Сколько?? Джарвис, такое вообще возможно?',
    image: '/step-four-assets/and-shocked.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#71afff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: '- Судя по последнему сигналу ваших короблей, многие ваши системы были повреждены.',
    image: '/step-four-assets/and-waiting.png',
    imageStyle: { transform: 'scale(1.4) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: '- Включая систему навигации и системы двигателей. \n Это объясняет, почему его забросило так далеко.',
    image: '/step-four-assets/and-waiting.png',
    imageStyle: { transform: 'scale(1.4) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff' },
  },
  {
    kind: 'arrival',
    speaker: 'andrey',
    text: '- М-да... Тяжеловато.',
    image: '/step-four-assets/and-suffering.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#71afff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'andrew',
    text: '- Тогда, мэнчик, давай соберем движок и полетим навстречу.',
    image: '/step-four-assets/and-waiting.png',
    imageStyle: { transform: 'scale(1.4) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#71afff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: '*тут Джарвис типа дает инструкции*',
    image: '/step-four-assets/and-engine.png',
    imageStyle: { transform: 'scale(1.4) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: '- Сэр, двигатель готов. \n Так же Руслан сообщил что он уже в пути.',
    image: '/step-four-assets/and-engine-done.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'andrew',
    text: '- Значит, и мы выдвигаемся.',
    image: '/step-four-assets/and-engine-done.png',
    imageStyle: { transform: 'scale(1.9) translateY(50px)' },
    textStyle: { fontSize: '18px', color: '#71afff' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: '- Сэр, учитывая Вашу текущую скорость, столкновение произойдет через 2 часа!',
    image: '/step-four-assets/and-flying.png',
    textStyle: { fontSize: '18px', color: '#1c567a9c', textShadow: '1px 1px 0px #29adff', transform: 'translateY(-20px)' },
  },
  {
    kind: 'arrival',
    speaker: 'andrew',
    text: '- Отлично! Тогда давай ускоримся!',
    image: '/step-four-assets/and-flying.png',
    textStyle: { fontSize: '18px', color: '#71afff' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: 'Спустя 2 часа...',
    textStyle: { fontSize: '18px', color: '#b9e4ff9c' },
  },
  {
    kind: 'action',
    action: 'reunion',
    text: '',
    image: null,
  },
  {
    kind: 'dialogue',
    speaker: 'andrey',
    text: '- Никакое расстояние не заставит меня любить тебя меньше.',
    image: '/step-four-assets/final.png',
    imageStyle: { transform: 'scale(1.2)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f' },
  },
  {
    kind: 'dialogue',
    speaker: 'andrey',
    text: '- И я так же знаю, какой занозой в заднице я могу быть.',
    image: '/step-four-assets/final.png',
    imageStyle: { transform: 'scale(1.2)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f' },
  },
  {
    kind: 'dialogue',
    speaker: 'andrey',
    text: '- Но я надеюсь, что мое иногда бесячее поведение не рушит твою любовь ко мне!',
    image: '/step-four-assets/final.png',
    imageStyle: { transform: 'scale(1.2)' },
    textStyle: { fontSize: '18px', color: '#ff6f6f' },
  },
  {
    kind: 'dialogue',
    speaker: 'ruslan',
    text: '- А вообще... хрена мы тут поднасрали...',
    image: '/step-four-assets/final-2.png',
    imageStyle: { transform: 'scale(1.7) translateY(-20px)' },
    textStyle: { fontSize: '18px', color: '#ff6f6fa1' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: 'Надеюсь, не слишком кринжово вышло 😬',
    textStyle: { fontSize: '18px', color: '#eaf7ffe1' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: 'Но да, мораль сей басни такова, что я тебя люблю даже если ты за 13 миллионов километров от меня ❤️',
    textStyle: { fontSize: '18px', color: '#eaf7ffe1' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: 'Я все еще не хочу звучать слащаво,\n но ты действительно лучшее, что со мной случалось. \nИ по этому я буду стараться делать тебя счастливым, жопик :)',
    textStyle: { fontSize: '18px', color: '#eaf7ffe1' },
  },
  {
    kind: 'arrival',
    speaker: 'ajax',
    text: 'И кстати, у нас ровно 5 месяцев, \n поздравляю! 🎉',
    textStyle: { fontSize: '18px', color: '#eaf7ffe1' },
  },
  {
    kind: 'ending',
    text: '',
    image: null,
  },
]

function createStars() {
  const colors = ['#f5f7ff', '#c9d7ff', '#f6eaff', '#d7f5ff']

  return Array.from({ length: STAR_COUNT }, (_, index) => {
    const size = index % 13 === 0 ? 3 : index % 4 === 0 ? 2.5 : 2
    const isBright = index % 9 === 0

    return {
      id: index,
      x: index === 0 ? Math.random() * 48 : Math.random() * 100,
      y: index === 0 ? Math.random() * 48 : Math.random() * 100,
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

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2
}

export default function FourthStage({ onPrevious, onRestart, onEndMusicFade }) {
  const [starFieldVersion, setStarFieldVersion] = useState(0)
  const [starfieldStabilized, setStarfieldStabilized] = useState(false)
  const stars = useMemo(createStars, [starFieldVersion])
  const stageRef = useRef(null)
  const morseAudioRef = useRef(null)
  const starfieldRef = useRef(null)
  const characterTravelRef = useRef(null)
  const messageFrameRef = useRef(null)
  const imageFrameRef = useRef(null)
  const imageRef = useRef(null)
  const imageGlitchCanvasRef = useRef(null)
  const starElementRefs = useRef([])
  const travelTargetRef = useRef(null)
  const hasSwitchedImageDuringGlitchRef = useRef(false)

  const [stepIndex, setStepIndex] = useState(0)
  const [shownStepIndex, setShownStepIndex] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const [isGlitching, setIsGlitching] = useState(false)
  const [isImageRising, setIsImageRising] = useState(false)
  const [travelPhase, setTravelPhase] = useState('idle')
  const [targetStarId, setTargetStarId] = useState(null)
  const [reunionPhase, setReunionPhase] = useState('idle')

  const activeStep = STORY_STEPS[stepIndex] || STORY_STEPS[STORY_STEPS.length - 1]
  const isReunionAction = activeStep.kind === 'action' && activeStep.action === 'reunion'
  const isEnding = activeStep.kind === 'ending'
  const shouldRenderReunionCharacters = isReunionAction && (
    reunionPhase === 'approaching' ||
    reunionPhase === 'characters-fading-out' ||
    reunionPhase === 'stars-returning'
  )
  const isReunionFadeVisible = reunionPhase === 'stars-fading-out' ||
    reunionPhase === 'characters-fading-out'
  const visibleStep = STORY_STEPS[shownStepIndex] || activeStep
  const isTravelNarrationVisible = activeStep.action === 'star-travel' &&
    (travelPhase === 'targeting' || travelPhase === 'traveling')
  const starsForArrival = activeStep.kind === 'arrival' ||
    travelPhase === 'arrival' ||
    travelPhase === 'revealing' ||
    travelPhase === 'arrived'
  const messageShouldBeHidden = travelPhase !== 'idle' &&
    travelPhase !== 'arrived' &&
    !isTravelNarrationVisible
  const canTypeText = !activeStep.typeAfterImageArrival || travelPhase === 'arrived'

  useEffect(() => {
    if (!isEnding) return undefined

    const timeout = window.setTimeout(onEndMusicFade, 5000)
    return () => window.clearTimeout(timeout)
  }, [isEnding, onEndMusicFade])

  useEffect(() => {
    const characters = Array.from(activeStep.text || '')
    let characterIndex = 0
    let timerId = 0

    const stopMorse = () => {
      const audio = morseAudioRef.current
      if (!audio) return
      audio.pause()
      audio.currentTime = 0
    }

    setTypedText('')
    if (!canTypeText) {
      setIsTypingComplete(false)
      stopMorse()
      return undefined
    }

    if (characters.length === 0) {
      setIsTypingComplete(true)
      stopMorse()
      return undefined
    }
    setIsTypingComplete(false)

    const typeNextCharacter = () => {
      if (characterIndex === 0) {
        const audio = morseAudioRef.current
        if (audio) {
          audio.currentTime = 0
          audio.play().catch((error) => {
            console.error('Не удалось запустить morse.mp3:', error)
          })
        }
      }

      characterIndex += 1
      if (stepIndex === 0 && characterIndex === 1 && activeStep.kind === 'dialogue') {
        setIsImageRising(true)
      }
      setTypedText(characters.slice(0, characterIndex).join(''))

      if (characterIndex >= characters.length) {
        setIsTypingComplete(true)
        stopMorse()
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
      stepIndex === 0 ? INITIAL_PAUSE_MS + FIRST_TEXT_DELAY_MS : NEXT_TEXT_DELAY_MS,
    )

    return () => {
      window.clearTimeout(timerId)
      stopMorse()
    }
  }, [stepIndex, activeStep, canTypeText])

  useEffect(() => {
    if (!isReunionAction || reunionPhase !== 'idle') return
    setStarFieldVersion((version) => version + 1)
    setStarfieldStabilized(true)
    setReunionPhase('stars-fading-out')
  }, [isReunionAction, reunionPhase])

  useEffect(() => {
    if (!isReunionAction) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = (milliseconds) => reducedMotion ? Math.min(80, milliseconds) : milliseconds
    let timeout

    if (reunionPhase === 'stars-fading-out') {
      timeout = window.setTimeout(
        () => setReunionPhase('stars-fading-in'),
        duration(REUNION_FADE_DURATION_MS),
      )
    } else if (reunionPhase === 'stars-fading-in') {
      timeout = window.setTimeout(
        () => setReunionPhase('approaching'),
        duration(REUNION_STARS_REVEAL_MS),
      )
    } else if (reunionPhase === 'approaching') {
      timeout = window.setTimeout(
        () => setReunionPhase('characters-fading-out'),
        duration(REUNION_APPROACH_DURATION_MS),
      )
    } else if (reunionPhase === 'characters-fading-out') {
      timeout = window.setTimeout(
        () => setReunionPhase('stars-returning'),
        duration(REUNION_FADE_DURATION_MS),
      )
    } else if (reunionPhase === 'stars-returning') {
      timeout = window.setTimeout(() => {
        const nextStepIndex = Math.min(stepIndex + 1, STORY_STEPS.length - 1)
        setShownStepIndex(nextStepIndex)
        setStepIndex(nextStepIndex)
        setReunionPhase('complete')
      }, duration(REUNION_STARS_RETURN_MS))
    }

    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [isReunionAction, reunionPhase, stepIndex])

  const beginSpaceTravel = useCallback((nextStepIndex) => {
    const upperLeftStars = stars.filter((star) => star.x <= 48 && star.y <= 48)
    const visibleUpperLeftStars = upperLeftStars.filter((star) => {
      const element = starElementRefs.current[star.id]
      return element && Number.parseFloat(window.getComputedStyle(element).opacity) > 0.2
    })
    const candidates = visibleUpperLeftStars.length > 0 ? visibleUpperLeftStars : upperLeftStars
    const target = candidates[Math.floor(Math.random() * candidates.length)]

    travelTargetRef.current = target
    setStepIndex(nextStepIndex)
    setTargetStarId(target.id)
    setTravelPhase('targeting')
  }, [stars])

  const switchImageDuringGlitch = useCallback(() => {
    if (hasSwitchedImageDuringGlitchRef.current) return
    hasSwitchedImageDuringGlitchRef.current = true
    setShownStepIndex((current) => Math.min(current + 1, STORY_STEPS.length - 1))
  }, [])

  const finishTextGlitch = useCallback(() => {
    switchImageDuringGlitch()
    setStepIndex((current) => Math.min(current + 1, STORY_STEPS.length - 1))
    setIsGlitching(false)
    setTravelPhase((current) => current === 'arrived' ? 'idle' : current)
  }, [switchImageDuringGlitch])

  useEffect(() => {
    if (!isGlitching) return undefined

    const timeout = window.setTimeout(finishTextGlitch, 900)
    return () => window.clearTimeout(timeout)
  }, [isGlitching, finishTextGlitch])

  const handleNext = () => {
    if (!isTypingComplete || isGlitching) return
    if (travelPhase !== 'idle' && travelPhase !== 'arrived') return

    const nextStepIndex = stepIndex + 1
    const nextStep = STORY_STEPS[nextStepIndex]
    if (!nextStep) return

    if (nextStep.action === 'star-travel') {
      beginSpaceTravel(nextStepIndex)
      return
    }

    hasSwitchedImageDuringGlitchRef.current = false
    setIsGlitching(true)
  }

  useEffect(() => {
    if (travelPhase !== 'targeting') return undefined
    const timeout = window.setTimeout(() => setTravelPhase('traveling'), TARGETING_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [travelPhase])

  // Every star moves independently; neither the starfield nor the canvas is scaled.
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
    const targetOriginX = (target.x / 100) * viewportWidth
    const targetOriginY = (target.y / 100) * viewportHeight
    const startedAt = performance.now()
    let lastFrameAt = startedAt
    let animationFrame = 0

    const motion = stars.map((star) => ({
      id: star.id,
      rayX: (star.x / 100) * viewportWidth - targetOriginX,
      rayY: (star.y / 100) * viewportHeight - targetOriginY,
      baseSize: star.size,
      baseOpacity: Number.parseFloat(star.opacity),
      speed: 0.78 + Math.random() * 0.58,
      depth: 1,
      bornAt: 0,
      isTarget: star.id === target.id,
    }))

    const render = (timestamp) => {
      const elapsed = Math.max(0, timestamp - startedAt)
      const delta = Math.min(42, Math.max(0, timestamp - lastFrameAt))
      lastFrameAt = timestamp
      const progress = Math.min(1, elapsed / TRAVEL_DURATION_MS)
      const currentWidth = Math.max(1, window.innerWidth)
      const currentHeight = Math.max(1, window.innerHeight)
      const vanishingX = targetOriginX * (currentWidth / viewportWidth)
      const vanishingY = targetOriginY * (currentHeight / viewportHeight)
      const perspectiveSpeed = 0.000055 + progress * 0.00032

      motion.forEach((star) => {
        const element = starElementRefs.current[star.id]
        if (!element) return

        if (star.isTarget) {
          // The selected star stays pixel-sized and fades as we pass its position.
          const targetFade = Math.max(0, 1 - Math.min(1, progress / 0.24))
          element.style.left = vanishingX + 'px'
          element.style.top = vanishingY + 'px'
          element.style.transform = 'translate3d(-50%, -50%, 0)'
          element.style.setProperty('--star-size', star.baseSize + 'px')
          element.style.opacity = String(star.baseOpacity * targetFade)
          return
        }

        star.depth -= delta * perspectiveSpeed * star.speed
        let depth = Math.max(0.115, star.depth)
        let scale = 1 / depth
        let screenX = vanishingX + star.rayX * scale
        let screenY = vanishingY + star.rayY * scale
        let size = star.baseSize * scale

        const passedCamera = star.depth <= 0.115
        const outsideViewport =
          screenX < -size * 2 - 12 ||
          screenX > currentWidth + size * 2 + 12 ||
          screenY < -size * 2 - 12 ||
          screenY > currentHeight + size * 2 + 12

        if (passedCamera || outsideViewport) {
          const spawnX = Math.random() * currentWidth
          const spawnY = Math.random() * currentHeight
          star.rayX = spawnX - vanishingX
          star.rayY = spawnY - vanishingY
          star.depth = 1
          star.speed = 0.78 + Math.random() * 0.58
          star.bornAt = timestamp
          depth = 1
          scale = 1
          screenX = spawnX
          screenY = spawnY
          size = star.baseSize
        }

        const birthFade = star.bornAt
          ? Math.min(1, Math.max(0, (timestamp - star.bornAt) / 220))
          : 1
        const nearFade = Math.max(0, Math.min(1, (depth - 0.115) / 0.2))
        const edgeDistance = Math.min(
          screenX,
          screenY,
          currentWidth - screenX,
          currentHeight - screenY,
        )
        const edgeFade = Math.max(
          0,
          Math.min(1, edgeDistance / Math.max(18, size * 2.8)),
        )
        const endFadeProgress = Math.max(0, Math.min(1, (progress - 0.72) / 0.28))
        const endFade = 1 - (
          endFadeProgress * endFadeProgress * (3 - 2 * endFadeProgress)
        )
        const opacity = star.baseOpacity * birthFade * nearFade * edgeFade * endFade

        element.style.left = screenX + 'px'
        element.style.top = screenY + 'px'
        element.style.transform = 'translate3d(-50%, -50%, 0)'
        element.style.setProperty('--star-size', size + 'px')
        element.style.opacity = String(opacity)
      })

      const characterProgress = easeInOutCubic(progress)
      character.style.transform =
        'translate3d(' + (window.innerWidth * 1.05 * characterProgress) + 'px, ' +
        (window.innerHeight * 1.05 * characterProgress) + 'px, 0)'
      character.style.opacity = String(Math.max(0, 1 - Math.max(0, (progress - 0.48) / 0.52)))

      if (progress >= 1) {
        setTravelPhase('blackout')
        return
      }

      animationFrame = window.requestAnimationFrame(render)
    }

    animationFrame = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [travelPhase, stars])

  // Restore the field under the fade, then continue through the same story array.
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
          element.style.setProperty('--star-size', star.size + 'px')
        })
        if (characterTravelRef.current) {
          characterTravelRef.current.style.transform = 'none'
          characterTravelRef.current.style.opacity = ''
        }
        setTargetStarId(null)

        const nextStepIndex = Math.min(stepIndex + 1, STORY_STEPS.length - 1)
        const nextStep = STORY_STEPS[nextStepIndex]
        if (nextStep?.action === 'star-travel') {
          beginSpaceTravel(nextStepIndex)
          return
        }

        setShownStepIndex(nextStepIndex)
        setStepIndex(nextStepIndex)
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
  }, [travelPhase, stars, stepIndex, beginSpaceTravel])

  const isTravelOverlayVisible = travelPhase === 'blackout' || travelPhase === 'arrival'
  const showControls = (travelPhase === 'idle' || travelPhase === 'arrived') &&
    !isReunionAction &&
    !isEnding

  return (
    <main
      ref={stageRef}
      className={
        'stage-four' +
        (travelPhase === 'targeting' ? ' stage-four--targeting' : '') +
        (travelPhase === 'traveling' || travelPhase === 'blackout' ? ' stage-four--traveling' : '') +
        (starsForArrival ? ' stage-four--arrived' : '') +
        (starfieldStabilized ? ' stage-four--stars-stabilized' : '') +
        (isReunionAction ? ' stage-four--reunion' : '') +
        (reunionPhase === 'stars-fading-out' || reunionPhase === 'characters-fading-out'
          ? ' stage-four--reunion-stars-hidden'
          : '')
      }
      aria-label="Четвёртый этап"
    >
      <audio ref={morseAudioRef} src="/morse.mp3" loop preload="auto" />

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

      <div
        ref={characterTravelRef}
        className={
          'stage-four__character-travel' +
          (visibleStep.imageLayout === 'fullscreen'
            ? ' stage-four__character-travel--fullscreen'
            : '')
        }
        aria-hidden="true"
      >
        <div
          ref={imageFrameRef}
          className={
            'stage-four__image-frame' +
            (visibleStep.imageLayout === 'fullscreen'
              ? ' stage-four__image-frame--fullscreen'
              : starsForArrival
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
          {visibleStep.image && (
            <img
              ref={imageRef}
              className="stage-four__image"
              src={visibleStep.image}
              alt=""
              style={visibleStep.imageStyle}
              onLoad={(event) => {
                event.currentTarget.style.visibility = 'visible'
              }}
              onError={(event) => {
                // Hide the intentionally missing space-debris placeholder until its asset is added.
                event.currentTarget.style.visibility = 'hidden'
              }}
            />
          )}
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
            (messageShouldBeHidden ? ' stage-four__message-frame--hidden' : '')
          }
        >
          <p className="stage-four__message" aria-live="polite" style={activeStep.textStyle}>
            {typedText}
          </p>
          {isGlitching && (
            <TextGlitchCanvas
              text={activeStep.text || ''}
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
            !isTypingComplete ||
            isGlitching ||
            !STORY_STEPS[stepIndex + 1]
          }
        />
      )}

      {isEnding && (
        <button
          className="stage-four__restart"
          type="button"
          onClick={onRestart}
        >
          Начать сначала
        </button>
      )}

      {shouldRenderReunionCharacters && (
        <div
          className={
            'stage-four__reunion-characters' +
            (reunionPhase === 'characters-fading-out' || reunionPhase === 'stars-returning'
              ? ' stage-four__reunion-characters--fading'
              : '')
          }
          aria-hidden="true"
        >
          <div className="stage-four__reunion-person stage-four__reunion-person--andrey">
            <img src="/step-four-assets/and-left-top-corenr.png" alt="" />
          </div>
          <div className="stage-four__reunion-person stage-four__reunion-person--ruslan">
            <img src="/step-four-assets/rus-right-bottom-corenr.png" alt="" />
          </div>
        </div>
      )}

      <div
        className={
          'stage-four__travel-fade' +
          (isTravelOverlayVisible ? ' stage-four__travel-fade--visible' : '')
        }
        aria-hidden="true"
      />

      <div
        className={
          'stage-four__reunion-fade' +
          (isReunionFadeVisible ? ' stage-four__reunion-fade--visible' : '')
        }
        aria-hidden="true"
      />
    </main>
  )
}
