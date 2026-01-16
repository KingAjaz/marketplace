'use client'

/**
 * Rice Animation Scrollytelling Component
 * 
 * High-end scroll-driven animation using Framer Motion and HTML5 Canvas
 * Creates a cinematic rice falling animation synced to scroll position
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useScroll, useTransform } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface RiceAnimateProps {
  frameCount?: number
  framePath?: string
  scrollHeight?: string
}

export function RiceAnimate({ 
  frameCount = 40,
  framePath = '/rice animate/ezgif-frame-{INDEX}.jpg',
  scrollHeight = '400vh'
}: RiceAnimateProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number>(-1)

  // Framer Motion scroll tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  })

  // Transform scroll progress (0-1) to frame index (0-39)
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, frameCount - 1])

  // Preload all images
  useEffect(() => {
    const loadImages = async () => {
      const imagePromises: Promise<HTMLImageElement>[] = []

      for (let i = 1; i <= frameCount; i++) {
        const frameIndex = i.toString().padStart(3, '0')
        const imagePath = framePath.replace('{INDEX}', frameIndex)
        
        const img = new Image()
        const promise = new Promise<HTMLImageElement>((resolve, reject) => {
          img.onload = () => {
            setLoadingProgress((i / frameCount) * 100)
            resolve(img)
          }
          img.onerror = () => {
            console.error(`Failed to load frame ${i}: ${imagePath}`)
            reject(new Error(`Failed to load frame ${i}`))
          }
          img.src = imagePath
        })
        
        imagePromises.push(promise)
      }

      try {
        const loadedImages = await Promise.all(imagePromises)
        imagesRef.current = loadedImages
        setImagesLoaded(true)
      } catch (error) {
        console.error('Failed to load some animation frames:', error)
        // Continue with what we have
        if (imagesRef.current.length > 0) {
          setImagesLoaded(true)
        }
      }
    }

    loadImages()
  }, [frameCount, framePath])

  // Draw frame to canvas
  const drawFrame = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current
    if (!canvas || !imagesLoaded || imagesRef.current.length === 0) return

    const clampedFrame = Math.max(0, Math.min(frameCount - 1, Math.floor(frameIdx)))
    
    // Skip if same frame
    if (clampedFrame === lastFrameRef.current) return
    lastFrameRef.current = clampedFrame

    const image = imagesRef.current[clampedFrame]
    if (!image || !image.complete || image.naturalWidth === 0) return

    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    })
    if (!ctx) return

    // Get container dimensions
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const displayWidth = window.innerWidth
    const displayHeight = window.innerHeight

    // Set canvas size (accounting for device pixel ratio for crisp rendering)
    const dpr = window.devicePixelRatio || 1
    const canvasWidth = displayWidth * dpr
    const canvasHeight = displayHeight * dpr

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      canvas.style.width = `${displayWidth}px`
      canvas.style.height = `${displayHeight}px`
      ctx.scale(dpr, dpr)
    }

    // Clear and draw image (cover style)
    ctx.clearRect(0, 0, displayWidth, displayHeight)
    
    // Calculate scaling to cover entire canvas while maintaining aspect ratio
    const scale = Math.max(
      displayWidth / image.width,
      displayHeight / image.height
    )
    
    const scaledWidth = image.width * scale
    const scaledHeight = image.height * scale
    const x = (displayWidth - scaledWidth) / 2
    const y = (displayHeight - scaledHeight) / 2

    // High-quality rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, x, y, scaledWidth, scaledHeight)
  }, [imagesLoaded, frameCount])

  // Subscribe to frame index changes and draw
  useEffect(() => {
    if (!imagesLoaded) return

    const unsubscribe = frameIndex.on('change', (latest) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = requestAnimationFrame(() => {
        drawFrame(latest)
      })
    })

    // Initial draw
    drawFrame(0)

    return () => {
      unsubscribe()
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [imagesLoaded, frameIndex, drawFrame])

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      style={{ height: scrollHeight }}
    >
      {/* Sticky Canvas Container */}
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-green-50 to-green-100">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{
            backgroundColor: '#f0fdf4', // Match green-50 background exactly
            imageRendering: 'auto',
          }}
        />
      </div>

      {/* Loading Overlay */}
      {!imagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 z-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading animation...</p>
            <div className="mt-2 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
