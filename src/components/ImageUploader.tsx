import { useCallback, useState, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Star, GripVertical, Upload, Loader2, X } from 'lucide-react'
import type { ProductImage } from '@/types'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Props {
  productId: number
  images: ProductImage[]
  onImagesChange: (images: ProductImage[]) => void
}

function SortableImage({
  image,
  onDelete,
  onSetCover,
  onPreview,
  onLongPress,
}: {
  image: ProductImage
  onDelete: (id: number) => void
  onSetCover: (id: number) => void
  onPreview: (url: string) => void
  onLongPress: (image: ProductImage) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const timerRef = useRef<any>(null)
  const isLongPress = useRef(false)
  const hasMoved = useRef(false)

  const startPress = () => {
    isLongPress.current = false
    hasMoved.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress(image)
    }, 600) // 600ms hold triggers menu
  }

  const endPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (!isLongPress.current && !hasMoved.current) {
      onPreview(image.url)
    }
  }

  const handleMove = () => {
    hasMoved.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100 shadow-sm transition-all cursor-pointer"
      {...attributes}
      {...listeners}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseMove={handleMove}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={handleMove}
    >
      <img
        src={image.thumbnail_url || image.url}
        alt=""
        className="w-full h-full object-cover select-none pointer-events-none"
      />
      {image.is_cover && (
        <div className="absolute top-1.5 left-1.5 bg-primary-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow">
          Cover
        </div>
      )}
    </div>
  )
}

export default function ImageUploader({ productId, images, onImagesChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [optionsImage, setOptionsImage] = useState<ProductImage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDrop = useCallback(
    async (files: File[]) => {
      setUploading(true)
      try {
        const formData = new FormData()
        files.forEach((f) => formData.append('files', f))
        formData.append('image_type', 'other')
        const { data } = await api.post(`/images/upload/${productId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onImagesChange([...images, ...data])
        toast.success(`${files.length} image(s) uploaded!`)
      } catch {
        toast.error('Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [productId, images, onImagesChange],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  })

  const handleDelete = async (imageId: number) => {
    try {
      await api.delete(`/images/${imageId}`)
      onImagesChange(images.filter((i) => i.id !== imageId))
      toast.success('Image deleted')
    } catch {
      toast.error('Failed to delete image')
    }
  }

  const handleSetCover = async (imageId: number) => {
    try {
      await api.patch(`/images/${imageId}/set-cover`)
      onImagesChange(images.map((i) => ({ ...i, is_cover: i.id === imageId })))
      toast.success('Cover image updated')
    } catch {
      toast.error('Failed to set cover')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = images.findIndex((i) => i.id === active.id)
    const newIndex = images.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(images, oldIndex, newIndex).map((img, idx) => ({
      ...img,
      sort_order: idx,
    }))
    onImagesChange(reordered)
    await api.patch('/images/reorder', {
      images: reordered.map((i) => ({ id: i.id, sort_order: i.sort_order })),
    }).catch(() => {})
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-pink-50/30'
        }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-primary-500">
            <Loader2 size={32} className="animate-spin" />
            <p className="text-sm font-medium">Uploading to Cloudinary…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
              <Upload size={24} className="text-primary-500" />
            </div>
            <p className="font-semibold text-gray-700 text-sm">
              {isDragActive ? 'Drop images here!' : 'Drag & drop images here'}
            </p>
            <p className="text-xs text-gray-400">or click to browse • JPG, PNG, WebP • Max 10MB each</p>
          </div>
        )}
      </div>

      {/* Sortable image grid */}
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map((img) => (
                <SortableImage
                  key={img.id}
                  image={img}
                  onDelete={handleDelete}
                  onSetCover={handleSetCover}
                  onPreview={(url) => setPreviewUrl(url)}
                  onLongPress={(img) => setOptionsImage(img)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {images.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Drag to reorder • Tap photo to preview • Press & hold to manage
        </p>
      )}

      {/* Fullscreen image preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}

      {/* Screen Centered Popup for Image Actions */}
      {optionsImage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs text-center space-y-4 shadow-lifted animate-scale-in">
            <h3 className="font-semibold text-gray-900 text-base">Image Options</h3>
            <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto bg-gray-100 border border-gray-100 shadow-sm">
              <img src={optionsImage.thumbnail_url || optionsImage.url} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="space-y-2 pt-2">
              {!optionsImage.is_cover && (
                <button
                  onClick={() => {
                    handleSetCover(optionsImage.id)
                    setOptionsImage(null)
                  }}
                  className="w-full py-3 bg-primary-50 text-primary-600 rounded-2xl text-sm font-semibold hover:bg-primary-100 transition-colors"
                >
                  Set as Cover
                </button>
              )}
              <button
                onClick={() => {
                  handleDelete(optionsImage.id)
                  setOptionsImage(null)
                }}
                className="w-full py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                Delete Photo
              </button>
              <button
                onClick={() => setOptionsImage(null)}
                className="w-full py-3 bg-gray-50 text-gray-500 rounded-2xl text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
