import { useEffect, useRef, useState } from 'react'
import './WelcomeStage.css'

const GREETING = 'Привет, мой любимый жопик'
const HEART = '♥'
const PINK = '#f4a6c1'
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя0123456789@#$%&*+=<>?/'

const random = (min, max) => min + Math.random() * (max - min)

function heartPoint(t, scale = 1) {
  const x = 16 * Math.sin(t) ** 3
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
  return { x: x * scale, y: -y * scale }
}

function createHeartParticles(width, height, amount) {
  const particles = []
  const scale = Math.min(width, height) / 38
  for (let i = 0; i < amount; i += 1) {
    const t = (i / amount) * Math.PI * 2
    const point = heartPoint(t, scale)
    const jitter = random(-2.5, 2.5)
    particles.push({
      x: width / 2 + random(-width * 0.42, width * 0.42),
      y: height / 2 + random(-height * 0.42, height * 0.42),
      startX: 0,
      startY: 0,
      targetX: width / 2 + point.x + jitter,
      targetY: height / 2 + point.y + jitter,
      driftX: random(-width * 0.7, width * 0.7),
      driftY: random(-height * 0.7, height * 0.7),
      size: random(2.5, 5.5),
      glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      delay: random(0, 0.2),
      phase: random(0, Math.PI * 2),
    })
  }
  return particles
}

export default function WelcomeStage() {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
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
    let heartScale = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      drawGreeting()
    }

    const drawGreeting = () => {
      context.fillStyle = '#050505'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#f7f7f7'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = `500 ${Math.min(27, Math.max(19, width / 15))}px Arial, sans-serif`
      context.fillText(GREETING, width / 2, height / 2, width - 36)
    }

    const drawParticle = (particle, x, y, alpha = 1, size = particle.size) => {
      context.globalAlpha = alpha
      context.fillStyle = '#fff'
      context.font = `600 ${size}px monospace`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(particle.glyph, x, y)
    }

    const animate = (now) => {
      const elapsed = Math.min(1, (now - startedAt) / 3600)
      context.fillStyle = phase === 'heart-grow' ? PINK : '#050505'
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
          const x = particle.targetX + particle.driftX * eased
          const y = particle.targetY + particle.driftY * eased
          drawParticle(particle, x, y, 1 - progress * 0.25)
        })
        const centerHeart = heartPoint(Math.PI * 1.5, Math.min(width, height) / 38)
        const hx = width / 2 + centerHeart.x
        const hy = height / 2 + centerHeart.y
        context.globalAlpha = 1
        context.fillStyle = '#fff'
        context.font = `600 ${Math.max(20, Math.min(width, height) / 18)}px monospace`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(HEART, hx, hy)
        if (progress >= 1) {
          phase = 'heart-grow'
          startedAt = now
        }
      } else if (phase === 'heart-grow') {
        const progress = Math.min(1, elapsed / 0.72)
        const eased = 1 - (1 - progress) ** 4
        heartScale = 1 + eased * Math.max(width, height) / 18
        context.save()
        context.translate(width / 2, height / 2)
        context.scale(heartScale, heartScale)
        context.fillStyle = PINK
        context.font = '600 22px monospace'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(HEART, 0, 0)
        context.restore()
        if (progress >= 1) {
          phase = 'done'
          setIsPink(true)
          setIsAnimating(false)
          return
        }
      }

      animationFrame = window.requestAnimationFrame(animate)
      frameRef.current = animationFrame
    }

    const begin = () => {
      if (phase !== 'idle') return
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setIsAnimating(true)
      if (reducedMotion) {
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
            if (image.data[(y * image.width + x) * 4] > 180) points.push({ x: x / pixelRatio, y: y / pixelRatio })
          }
        }
        particles.forEach((particle, index) => {
          const point = points[index % Math.max(1, points.length)]
          if (point) {
            particle.startX = point.x
            particle.startY = point.y
            particle.x = point.x
            particle.y = point.y
          } else {
            particle.startX = width / 2
            particle.startY = height / 2
          }
        })
      }
      animationFrame = window.requestAnimationFrame(animate)
      frameRef.current = animationFrame
    }

    canvas.addEventListener('click', begin)
    canvas.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        begin()
      }
    })
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    return () => {
      observer.disconnect()
      canvas.removeEventListener('click', begin)
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
