const SLIDESHOW_IMAGES = Array.from(
  { length: 35 },
  (_, index) => `/step-three-images/step-three-image-${index + 1}.jpg`,
)

const IMAGE_ASSETS = [
  // Prioritize character sprites so every later-stage transition is ready
  // even when someone advances quickly through the first two stages.
  '/step-four-assets/rus-shocked.png',
  '/step-four-assets/rus-confused.png',
  '/step-four-assets/rus-turned-around.png',
  '/step-three-assets/pixel-self-pulling.png',
  ...SLIDESHOW_IMAGES,
]

const MAX_PARALLEL_LOADS = 6
const imagePromises = new Map()
const loadQueue = []
let activeLoads = 0

function drainLoadQueue() {
  while (activeLoads < MAX_PARALLEL_LOADS && loadQueue.length > 0) {
    const task = loadQueue.shift()
    activeLoads += 1

    const image = new Image()
    let settled = false

    const settle = (loadedImage) => {
      if (settled) return
      settled = true
      image.onload = null
      image.onerror = null
      task.resolve(loadedImage)
      activeLoads -= 1
      drainLoadQueue()
    }

    const handleLoad = async () => {
      try {
        if (typeof image.decode === 'function') await image.decode()
      } catch {
        // A decoded image is a performance improvement, not a requirement.
      }

      settle(image.naturalWidth > 0 ? image : null)
    }

    image.decoding = 'async'
    image.onload = handleLoad
    image.onerror = () => settle(null)
    image.src = task.src

    // Cached images can already be complete before an onload callback fires.
    if (image.complete) {
      if (image.naturalWidth > 0) void handleLoad()
      else settle(null)
    }
  }
}

function preloadImage(src) {
  if (imagePromises.has(src)) return imagePromises.get(src)

  const promise = new Promise((resolve) => {
    loadQueue.push({ src, resolve })
    drainLoadQueue()
  })

  imagePromises.set(src, promise)
  return promise
}

/**
 * Starts warming every image as soon as the app opens. Nothing is mounted
 * into the visible document; images are decoded in memory and browser cache.
 */
export function preloadAllAssets() {
  return Promise.all(IMAGE_ASSETS.map(preloadImage))
}

/** Reuses the same loads started by preloadAllAssets and preserves slide order. */
export function preloadSlideshowImages() {
  return Promise.all(SLIDESHOW_IMAGES.map((src) => (
    preloadImage(src).then((image) => image ? src : null)
  ))).then((images) => images.filter(Boolean))
}
