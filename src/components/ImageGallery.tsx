import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import type { ProductImage } from '@/types'
import { getImageUrl } from '@/lib/api'

interface Props {
  images: ProductImage[]
  initialIndex?: number
  onClose?: () => void
  isFullscreen?: boolean
}

export default function ImageGallery({ images, initialIndex = 0, onClose, isFullscreen = false }: Props) {
  const [current, setCurrent] = useState(initialIndex)
  const [fullscreen, setFullscreen] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  const prev = useCallback(() => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1)), [images.length])
  const next = useCallback(() => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1)), [images.length])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') {
        if (fullscreen) setFullscreen(false)
        else onClose?.()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, fullscreen, onClose])

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX)
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const delta = touchStart - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) {
      delta > 0 ? next() : prev()
    }
    setTouchStart(null)
  }

  if (!images.length) {
    return (
      <div className="aspect-square bg-gray-100 rounded-3xl flex items-center justify-center">
        <span className="text-6xl">🎂</span>
      </div>
    )
  }

  const img = images[current]

  const GalleryContent = () => (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="relative aspect-square sm:aspect-[4/3] rounded-3xl overflow-hidden bg-gray-50 select-none cursor-pointer"
        onClick={() => setFullscreen(true)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={img.id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            src={getImageUrl(img.medium_url || img.url)}
            alt={img.alt_text || 'Cake image'}
            loading="lazy"
            className="w-full h-full object-contain cursor-zoom-in"
            onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
          />
        </AnimatePresence>

        {/* Arrows - desktop only */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur rounded-full items-center justify-center shadow-soft hover:bg-white transition-all z-10"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 backdrop-blur rounded-full items-center justify-center shadow-soft hover:bg-white transition-all z-10"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        {/* Indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur font-medium z-10">
            {current + 1} / {images.length}
          </div>
        )}

        {/* Fullscreen button */}
        {!isFullscreen && (
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-soft z-10"
          >
            <ZoomIn size={14} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {images.map((thumb, i) => (
            <button
              key={thumb.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${
                i === current ? 'border-primary-500 shadow-md' : 'border-transparent opacity-60'
              }`}
            >
              <img
                src={getImageUrl(thumb.thumbnail_url || thumb.url)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <GalleryContent />

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setFullscreen(false); }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white z-20 hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex-1 flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                <motion.img
                  key={img.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  src={getImageUrl(img.large_url || img.url)}
                  alt={img.alt_text || ''}
                  className="max-w-full max-h-full object-contain rounded-2xl"
                />
              </AnimatePresence>
            </div>
            {/* Fullscreen thumbnails */}
            {images.length > 1 && (
              <div className="flex justify-center gap-2 p-4">
                {images.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 z-20 ${
                      i === current ? 'border-white' : 'border-transparent opacity-50'
                    }`}
                  >
                    <img src={getImageUrl(t.thumbnail_url || t.url)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white z-20 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white z-20 hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
