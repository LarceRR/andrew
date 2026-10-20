import { useEffect, useRef, useState } from 'react'
import './WelcomeStage.css'

const GREETING = 'Привет, мой любимый жопик'
const HEART = '♥'
const PINK = '#f4a6c1'
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789@#$%&*+=<>?/'

const random = (min, max) => min + Math.random() * (max - min)

function heartPoint(t, scale = 1) {
  const x = 16 * Math.sin(t) **  3
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return { x: x * scale, y: -y * scale }
}

function createHeartParticles(width, height, amount) {
  const particles = []
  const scale = Math.min(width, height) / 38

  for (let i = 0; i < amount; i += 1) {
    const point = heartPoint((i / amount) * Math.PI * 2, scale)
    particles.push({
      startX: 0,
      startY: 0,
      targetX: width / 2 + point.x + random(-2.5, 2.5),
      targetY: height / 2 + point.y + random(-2.5, 2.5),
      driftX: random(-width * 0.7, width * 0.7),
      driftY: random(-height * 0.7, height * 0.7),
      size: random(2.5, 5.5),
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      delay: random(0, 0.2),
    })
  }

  return particles
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
    let animationFrame = 0
    let startedAt = 0
    let phase = 'idle'

    const drawGreeting = () => {
      context.fillStyle = '#050505'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#f7f7f7'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = `500 ${Math.min(27, Math.max(19, width / 15))}px Arial, sans-serif`
      context.fillText(GREETING, width / 2, height / 2, width - 36)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      if (phase === 'idle') drawGreeting()
      if (phase === 'done') {
        context.fillStyle = PINK
        context.fillRect(0, 0, width, height)
      }
    }

    const drawParticle = (particle, x, y, alpha = 1) => {
      context.globalAlpha = alpha
      context.fillStyle = '#fff'
      context.font = `600 ${particle.size}px monospace`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(particle.glyph, x, y)
    }

    const animate = (now) => {
      const elapsed = Math.min(1, (now - startedAt) / 1000)
      context.globalAlpha = 1
      context.fillStyle = '#050505'
      context.fillRect(0, 0, width, height)

      if (phase === 'morph') {
        const progress = Math.min(1, elapsed / 0.34)
        const eased = 1 - (1 - progress) ** 3

        particlesRef.current.forEach((particle) => {
          const local = Math.max(0, Math.min(1, (progress - particle.delay) / (1 - particle.delay)))
          const mix = 1 - (1 - local) ** 3
          const x = particle.startX + (particle.targetX - particle.startX) * mix
          const y = particle.startY + (particle.targetY - particle.startY) * mix
          drawParticle(particle, x, y, 0.35 + eased * 0.65)
        })

        if (progress >= 1) {
          phase = 'scatter'
          startedAt = now
        }
      } else if (phase === 'scatter') {
        const progress = Math.min(1, elapsed / 0.48)
        const eased = progress * progress

        particlesRef.current.forEach((particle) => {
          drawParticle(
            particle,
            particle.targetX + particle.driftX * eased,
            particle.targetY + particle.driftY * eased,
            1 - progress * 0.25,
          )
        })

        context.globalAlpha = 1
        context.fillStyle = '#fff'
        context.font = `600 ${Math.max(20, Math.min(width, height) / 18)}px monospace`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(HEART, width / 2, height / 2)

        if (progress >= 1) {
          phase = 'heart-grow'
          startedAt = now
        }
      } else if (phase === 'heart-grow') {
        const progress = Math.min(1, elapsed / 0.72)
        const scale = 1 + (1 - (1 - progress) ** 4) * Math.max(width, height) / 18

        context.save()
        context.translate(width / 2, height / 2)
        context.scale(scale, scale)
        context.fillStyle = PINK
        context.font = '600 22px monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(HEART, 0, 0)
        context.restore()

        if (progress >= 1) {
          phase = 'done'
          context.fillStyle = PINK
          context.fillRect(0, 0, width, height)
          setIsPink(true)
          setIsAnimating(false)
          return
        }
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const begin = () => {
      if (phase !== 'idle') return

      setIsAnimating(true)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        phase = 'done'
        context.fillStyle = PINK
        context.fillRect(0, 0, width, height)
        setIsPink(true)
        setIsAnimating(false)
        return
      }

      phase = 'morph'
      startedAt = performance.now()
      const amount = Math.max(150, Math.min(380, Math.floor((width * height) / 1800)))
      const particles = createHeartParticles(width, height, amount)
      particlesRef.current = particles

      const scratch = document.createElement('canvas')
      scratch.width = Math.round(width * pixelRatio)
      scratch.height = Math.round(height * pixelRatio)
      const scratchContext = scratch.getContext('2d')

      if (scratchContext) {
        scratchContext.scale(pixelRatio, pixelRatio)
        scratchContext.fillStyle = '#050505'
        scratchContext.fillRect(0, 0, width, height)
        scratchContext.fillStyle = '#fff'
        scratchContext.textAlign = 'center'
        scratchContext.textBaseline = 'middle'
        scratchContext.font = `500 ${Math.min(27, Math.max(19, width / 15))}px Arial, sans-serif`
        scratchContext.fillText(GREETING, width / 2, height / 2, width - 36)

        const image = scratchContext.getImageData(0, 0, scratch.width, scratch.height)
        const points = []
        const step = Math.max(3, Math.round(4 * pixelRatio))

        for (let y = 0; y < image.height; y += step) {
          for (let x = 0; x < image.width; x += step) {
            if (image.data[(y * image.width + x) * 4] > 180) {
              points.push({ x: x / pixelRatio, y: y / pixelRatio })
            }
          }
        }

        particles.forEach((particle, index) => {
          const point = points[index % Math.max(1, points.length)]
          particle.startX = point?.x ?? width / 2
          particle.startY = point?.y ?? height / 2
        })
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
    <main className={`welcome-stage ${isPink ? 'welcome-stage--pink' : ''}`}>
      <canvas
        ref={canvasRef}
        className="welcome-stage__canvas"
        role="button"
        tabIndex={0}
        aria-label={isAnimating ? 'Анимация перехода' : 'Нажми, чтобы продолжить'}
      />
      {!isAnimating && !isPink && (
        <p className="welcome-stage__hint" aria-hidden="true">нажми в любом месте</p>
      )}
    </main>
  )
}
