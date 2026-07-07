import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Product, ProductImage } from '@/types'
import ImageUploader from '@/components/ImageUploader'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'

const CATEGORIES_QUERY = () => api.get('/categories/all').then((r) => r.data)

const FLAVORS = ['Chocolate', 'Black Forest', 'Butterscotch', 'Vanilla', 'Pineapple', 'Strawberry', 'Red Velvet', 'Blueberry', 'Mango', 'Coffee', 'Mixed Fruit']
const SHAPES = ['Round', 'Square', 'Heart', 'Rectangle', 'Custom']
const KG_OPTIONS = Array.from({ length: 11 }, (_, i) => i) // 0 to 10
const GRAM_OPTIONS = Array.from({ length: 20 }, (_, i) => i * 50) // 0, 50, 100 ... 950

function parseWeightParts(weight: string): { kg: number; g: number } {
  const clean = (weight || '').toLowerCase().trim()
  const kgMatch = clean.match(/(\d+\.?\d*)\s*kg/)
  const gMatch = clean.match(/(\d+)\s*g(?!kg)/)
  const kg = kgMatch ? parseFloat(kgMatch[1]) : 0
  const totalG = gMatch ? parseInt(gMatch[1]) : 0
  if (!kgMatch && totalG > 0) {
    return { kg: Math.floor(totalG / 1000), g: totalG % 1000 }
  }
  const wholePart = Math.floor(kg)
  const fracG = Math.round((kg - wholePart) * 1000)
  return { kg: wholePart, g: fracG }
}

function buildWeight(kg: number, g: number): string {
  const totalG = kg * 1000 + g
  if (totalG === 0) return '500g'
  if (kg === 0) return `${g}g`
  if (g === 0) return `${kg}kg`
  return `${kg + g / 1000}kg`
}

const blank = {
  name: '', short_description: '', full_description: '',
  category_id: '', flavor: '', shape: '',
  weight_options: JSON.stringify(['500g', '1kg', '1.5kg', '2kg']),
  price_base_weight: '500g',
  original_price: '', selling_price: '', discount_percent: '0',
  preparation_time: '3 hours',
  storage_instructions: 'Store in refrigerator.',
  is_customizable: false, is_available: true, is_best_seller: false, is_trending: false, is_new_arrival: true,
  flavor_rates: '{}',
}

function parsePrepTime(timeStr: string = ''): { hours: number; minutes: number } {
  const clean = timeStr.toLowerCase().trim()
  const hrMatch = clean.match(/(\d+)\s*(?:hour|hr)/)
  const minMatch = clean.match(/(\d+)\s*(?:min)/)
  const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0
  const minutes = minMatch ? parseInt(minMatch[1], 10) : 0
  if (!hrMatch && !minMatch) {
    const numMatch = clean.match(/^(\d+)$/)
    if (numMatch) {
      return { hours: parseInt(numMatch[1], 10), minutes: 0 }
    }
  }
  return { hours, minutes }
}

function formatPrepTime(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '3 hours'
  const parts = []
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
  }
  if (minutes > 0) {
    parts.push(`${minutes} mins`)
  }
  return parts.join(' ')
}

function parseKg(str: string): number {
  const clean = str.toLowerCase().trim()
  const match = clean.match(/^([\d.]+)\s*(kg|g)/)
  if (match) {
    const val = parseFloat(match[1])
    const unit = match[2]
    if (unit === 'kg') return val
    if (unit === 'g') return val / 1000
  }
  return 0.5
}

// Sub-components declared outside to prevent component re-creation and input focus loss bugs
interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  )
}

interface ToggleProps {
  label: string
  value: boolean
  onToggle: () => void
}

function Toggle({ label, value, onToggle }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          onToggle()
        }}
        className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-primary-500' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

export default function AdminProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdit = !!id
  const [form, setForm] = useState<any>(blank)
  const [images, setImages] = useState<ProductImage[]>([])
  const [localFiles, setLocalFiles] = useState<{ id: string; file: File }[]>([])
  const [savedProductId, setSavedProductId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedWeights, setSelectedWeights] = useState<string[]>(['500g', '1kg', '1.5kg', '2kg'])
  const [addWeightKg, setAddWeightKg] = useState(0)
  const [addWeightG, setAddWeightG] = useState(500)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const [showFlavorManager, setShowFlavorManager] = useState(false)
  const [newFlavor, setNewFlavor] = useState('')
  const [creatingFlavor, setCreatingFlavor] = useState(false)
  const [deletedFlavors, setDeletedFlavors] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('deleted_flavors') || '[]')
    } catch {
      return []
    }
  })

  const [showShapeManager, setShowShapeManager] = useState(false)
  const [newShape, setNewShape] = useState('')
  const [creatingShape, setCreatingShape] = useState(false)
  const [addedShapes, setAddedShapes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('added_shapes') || '[]')
    } catch {
      return []
    }
  })
  const [deletedShapes, setDeletedShapes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('deleted_shapes') || '[]')
    } catch {
      return []
    }
  })

  const { data: categories } = useQuery({ queryKey: ['allCategories'], queryFn: CATEGORIES_QUERY })
  const { data: filtersData } = useQuery<{ flavors: string[], cake_types: string[] }>({
    queryKey: ['filtersList'],
    queryFn: () => api.get('/products/filters-list').then((r) => r.data),
  })

  const dynamicFlavors = (filtersData?.flavors?.length
    ? Array.from(new Set([...FLAVORS, ...filtersData.flavors]))
    : FLAVORS).filter(f => !deletedFlavors.includes(f))

  const dynamicShapes = Array.from(new Set([...SHAPES, ...addedShapes])).filter(s => !deletedShapes.includes(s))

  const { data: product } = useQuery<Product>({
    queryKey: ['product-admin', id],
    queryFn: () => api.get(`/products/id/${id}`).then((r) => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        short_description: product.short_description || '',
        full_description: product.full_description || '',
        category_id: product.category_id?.toString() || '',
        flavor: product.flavor || '',
        shape: product.shape || '',
        weight_options: product.weight_options || JSON.stringify(selectedWeights),
        original_price: product.original_price.toString(),
        selling_price: product.selling_price.toString(),
        discount_percent: product.discount_percent.toString(),
        price_base_weight: product.price_base_weight || '500g',
        preparation_time: product.preparation_time || '3 hours',
        serves: product.serves || '6-8 people',
        storage_instructions: product.storage_instructions || '',
        is_customizable: product.is_customizable,
        is_available: product.is_available,
        is_best_seller: product.is_best_seller,
        is_trending: product.is_trending,
        is_new_arrival: product.is_new_arrival,
        flavor_rates: product.flavor_rates || '{}',
      })
      setImages(product.images || [])
      setSavedProductId(product.id)
      try {
        setSelectedWeights(JSON.parse(product.weight_options || '[]'))
      } catch { }
    }
  }, [product])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const toggle = (k: string) => setForm((f: any) => ({ ...f, [k]: !f[k] }))

  const selectedFlavors = form.flavor
    ? form.flavor.split(',').map((f: string) => f.trim()).filter(Boolean)
    : []

  const toggleFlavor = (f: string) => {
    let nextFlavors;
    if (selectedFlavors.includes(f)) {
      nextFlavors = selectedFlavors.filter((x: string) => x !== f)
    } else {
      nextFlavors = [...selectedFlavors, f]
    }
    setForm((oldForm: any) => ({ ...oldForm, flavor: nextFlavors.join(', ') }))
  }

  const updateFlavorRate = (flavor: string, key: 'selling_price' | 'original_price', value: string) => {
    setForm((f: any) => {
      let rates: any = {}
      try {
        rates = typeof f.flavor_rates === 'string' ? JSON.parse(f.flavor_rates || '{}') : (f.flavor_rates || {})
      } catch (e) {
        rates = {}
      }
      const current = rates[flavor] || {}
      rates[flavor] = {
        ...current,
        [key]: value === '' ? undefined : parseFloat(value) || 0
      }
      if (rates[flavor].selling_price === undefined && rates[flavor].original_price === undefined) {
        delete rates[flavor]
      }
      return { ...f, flavor_rates: JSON.stringify(rates) }
    })
  }

  const addWeight = () => {
    const w = buildWeight(addWeightKg, addWeightG)
    if (selectedWeights.includes(w)) return
    const next = [...selectedWeights, w].sort((a, b) => parseKg(a) - parseKg(b))
    setSelectedWeights(next)
    setForm((f: any) => ({
      ...f,
      weight_options: JSON.stringify(next),
      price_base_weight: f.price_base_weight || w,
    }))
  }

  const removeWeight = (w: string) => {
    const next = selectedWeights.filter((x) => x !== w)
    setSelectedWeights(next)
    setForm((f: any) => {
      let nextBase = f.price_base_weight
      if (!next.includes(nextBase)) nextBase = next[0] || ''
      return { ...f, weight_options: JSON.stringify(next), price_base_weight: nextBase }
    })
  }

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      const { data } = await api.post('/categories/', {
        name: newCategoryName.trim(),
        sort_order: categories ? categories.length : 0,
      })
      queryClient.invalidateQueries({ queryKey: ['allCategories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setForm((f: any) => ({ ...f, category_id: String(data.id) }))
      toast.success('Category created!')
      setNewCategoryName('')
      setShowAddCategoryModal(false)
    } catch {
      toast.error('Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (catId: number) => {
    if (!window.confirm('Are you sure you want to delete this category? Products in this category will remain, but their category will be unassigned.')) return
    try {
      await api.delete(`/categories/${catId}`)
      queryClient.invalidateQueries({ queryKey: ['allCategories'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (form.category_id === String(catId)) {
        setForm((f: any) => ({ ...f, category_id: '' }))
      }
      toast.success('Category deleted')
    } catch {
      toast.error('Failed to delete category')
    }
  }

  const handleCreateFlavor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFlavor.trim()) return
    setCreatingFlavor(true)
    try {
      const added = newFlavor.trim()
      // Remove from deleted list if it was previously deleted
      const updatedDeleted = deletedFlavors.filter(f => f.toLowerCase() !== added.toLowerCase())
      setDeletedFlavors(updatedDeleted)
      localStorage.setItem('deleted_flavors', JSON.stringify(updatedDeleted))

      setForm((f: any) => ({ ...f, flavor: added }))
      toast.success('Flavor added to select!')
      setNewFlavor('')
      setShowFlavorManager(false)
    } catch {
      toast.error('Failed to add Flavor')
    } finally {
      setCreatingFlavor(false)
    }
  }

  const handleDeleteFlavor = async (flavorName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${flavorName}"? All products assigned this flavor will have their flavor cleared.`)) return
    try {
      await api.delete(`/products/flavors/${encodeURIComponent(flavorName)}`)
      queryClient.invalidateQueries({ queryKey: ['filtersList'] })
      queryClient.invalidateQueries({ queryKey: ['shopProducts'] })

      // Add to deleted list to prevent it showing up in the UI
      const updatedDeleted = Array.from(new Set([...deletedFlavors, flavorName]))
      setDeletedFlavors(updatedDeleted)
      localStorage.setItem('deleted_flavors', JSON.stringify(updatedDeleted))

      if (form.flavor === flavorName) {
        setForm((f: any) => ({ ...f, flavor: '' }))
      }
      toast.success('Flavor deleted')
    } catch {
      toast.error('Failed to delete Flavor')
    }
  }

  const handleCreateShape = (e: React.FormEvent) => {
    e.preventDefault()
    const val = newShape.trim()
    if (!val) return
    setCreatingShape(true)
    try {
      const nextAdded = Array.from(new Set([...addedShapes, val]))
      const nextDeleted = deletedShapes.filter(s => s.toLowerCase() !== val.toLowerCase())
      setAddedShapes(nextAdded)
      setDeletedShapes(nextDeleted)
      localStorage.setItem('added_shapes', JSON.stringify(nextAdded))
      localStorage.setItem('deleted_shapes', JSON.stringify(nextDeleted))
      setForm((f: any) => ({ ...f, shape: val }))
      toast.success('Shape added!')
      setNewShape('')
      setShowShapeManager(false)
    } catch {
      toast.error('Failed to add Shape')
    } finally {
      setCreatingShape(false)
    }
  }

  const handleDeleteShape = (shapeName: string) => {
    if (!window.confirm(`Are you sure you want to delete shape "${shapeName}"?`)) return
    const nextDeleted = Array.from(new Set([...deletedShapes, shapeName]))
    const nextAdded = addedShapes.filter(s => s !== shapeName)
    setAddedShapes(nextAdded)
    setDeletedShapes(nextDeleted)
    localStorage.setItem('added_shapes', JSON.stringify(nextAdded))
    localStorage.setItem('deleted_shapes', JSON.stringify(nextDeleted))
    if (form.shape === shapeName) {
      setForm((f: any) => ({ ...f, shape: '' }))
    }
    toast.success('Shape deleted')
  }


  const clearLocalFiles = () => {
    images.forEach((img) => {
      const imgId = img.id as any
      if (typeof imgId === 'string' && imgId.startsWith('local-')) {
        URL.revokeObjectURL(img.url)
      }
    })
    setLocalFiles([])
  }

  const handleDone = () => {
    clearLocalFiles()
    setForm(blank)
    navigate('/admin/products')
  }

  const handleCancel = () => {
    clearLocalFiles()
    setForm(blank)
    navigate('/admin/products')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const sellingPrice = parseFloat(form.selling_price) || 0
      const discount = parseFloat(form.discount_percent) || 0
      let originalPrice = sellingPrice
      if (discount > 0 && discount < 100) {
        originalPrice = sellingPrice / (1 - discount / 100)
      }

      const payload = {
        ...form,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        original_price: originalPrice,
        discount_percent: discount,
        selling_price: sellingPrice,
        is_eggless: true,
      }
      if (isEdit) {
        await api.put(`/products/${id}`, payload)
        queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
        queryClient.invalidateQueries({ queryKey: ['product-admin'] })
        queryClient.invalidateQueries({ queryKey: ['product'] })
        queryClient.invalidateQueries({ queryKey: ['featured'] })
        queryClient.invalidateQueries({ queryKey: ['trending'] })
        queryClient.invalidateQueries({ queryKey: ['newArrivals'] })
        queryClient.invalidateQueries({ queryKey: ['shopProducts'] })

        toast.success('Product updated!')
        handleDone()
      } else {
        const { data: newProduct } = await api.post('/products/', payload)

        if (localFiles.length > 0 && newProduct?.id) {
          const formData = new FormData()
          const sortedLocalFiles = images
            .filter((img) => {
              const imgId = img.id as any
              return typeof imgId === 'string' && imgId.startsWith('local-')
            })
            .map((img) => localFiles.find((lf) => lf.id === (img.id as any))?.file)
            .filter((file): file is File => !!file)

          sortedLocalFiles.forEach((file) => {
            formData.append('files', file)
          })
          formData.append('image_type', 'other')

          const { data: uploadedImages } = await api.post(`/images/upload/${newProduct.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })

          const firstImage = images[0]
          if (firstImage) {
            const firstImgId = firstImage.id as any
            if (typeof firstImgId === 'string' && firstImgId.startsWith('local-')) {
              const firstUploaded = uploadedImages[0]
              if (firstUploaded) {
                await api.patch(`/images/${firstUploaded.id}/set-cover`).catch(() => { })
              }
            }
          }
        }

        queryClient.invalidateQueries({ queryKey: ['adminProducts'] })
        queryClient.invalidateQueries({ queryKey: ['featured'] })
        queryClient.invalidateQueries({ queryKey: ['trending'] })
        queryClient.invalidateQueries({ queryKey: ['newArrivals'] })
        queryClient.invalidateQueries({ queryKey: ['shopProducts'] })

        toast.success('Product created successfully!')
        handleDone()
      }
    } catch {
      toast.error('Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 pb-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Product' : 'Add Product'}
        </h1>
        <button onClick={handleCancel} className="btn-ghost">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name at the Absolute Top */}
        <div className="card p-4 space-y-2">
          <label className="text-sm font-bold text-gray-700">Product Name <span className="text-red-400">*</span></label>
          <input className="input text-lg font-semibold" value={form.name} onChange={set('name')} placeholder="e.g. Chocolate Birthday Cake" required />
        </div>

        {/* Product Images */}
        <Section title="Product Images">
          <ImageUploader
            productId={savedProductId || undefined}
            images={images}
            onImagesChange={setImages}
            localFiles={localFiles}
            onLocalFilesChange={setLocalFiles}
          />
        </Section>

        {/* Basic Info */}
        <Section title="Basic Information">
          <Field label="Short Description">
            <input className="input" value={form.short_description} onChange={set('short_description')} placeholder="One-line description" />
          </Field>
          <Field label="Full Description">
            <textarea className="input resize-none" rows={4} value={form.full_description} onChange={set('full_description')} placeholder="Detailed description…" />
          </Field>
        </Section>

        {/* Category & Type */}
        <Section title="Cake Details">
          <Field label="Category">
            <div className="flex gap-2">
              <select
                className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 bg-white"
                value={form.category_id}
                onChange={set('category_id')}
              >
                <option value="">Select category</option>
                {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(true)}
                className="btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
              >
                + Add / Manage
              </button>
            </div>
          </Field>

          <Field label="Flavors (Select multiple)">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50/50 rounded-2xl border border-gray-150/70">
                {dynamicFlavors.map((f) => {
                  const active = selectedFlavors.includes(f)
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFlavor(f)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${active
                          ? 'border-primary-500 bg-primary-50 text-primary-500 shadow-sm'
                          : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                        }`}
                    >
                      {f}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 font-semibold truncate max-w-[70%]">
                  Selected: {selectedFlavors.length > 0 ? selectedFlavors.join(', ') : 'None'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFlavorManager(true)}
                  className="btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
                >
                  + Add / Manage
                </button>
              </div>
            </div>
          </Field>
          <Field label="Shape">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {dynamicShapes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f: any) => ({ ...f, shape: f.shape === s ? '' : s }))}
                    className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${form.shape === s ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-gray-200 text-gray-600'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 font-semibold truncate max-w-[70%]">
                  Selected Shape: {form.shape || 'None'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowShapeManager(true)}
                  className="btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
                >
                  + Add / Manage
                </button>
              </div>
            </div>
          </Field>
          <Field label="Weight Options">
            {/* Add weight row */}
            <div className="flex gap-2 items-center mb-3">
              <select
                className="input font-semibold flex-1 text-sm"
                value={addWeightKg}
                onChange={(e) => setAddWeightKg(parseInt(e.target.value))}
              >
                {KG_OPTIONS.map((kg) => (
                  <option key={kg} value={kg}>{kg} kg</option>
                ))}
              </select>
              <span className="text-gray-400 font-bold text-sm">+</span>
              <select
                className="input font-semibold flex-1 text-sm"
                value={addWeightG}
                onChange={(e) => setAddWeightG(parseInt(e.target.value))}
              >
                {GRAM_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g} g</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addWeight}
                className="btn-primary px-3 py-2 text-sm flex-shrink-0"
              >
                + Add
              </button>
            </div>
            {/* Selected weight tags */}
            <div className="flex flex-wrap gap-2">
              {selectedWeights.length === 0 && (
                <span className="text-sm text-gray-400">No weights added yet</span>
              )}
              {selectedWeights.map((w) => (
                <div
                  key={w}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-primary-500 bg-primary-50 text-primary-600 text-sm font-semibold"
                >
                  {w}
                  <button
                    type="button"
                    onClick={() => removeWeight(w)}
                    className="ml-1 text-primary-400 hover:text-red-500 font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Storage Instructions">
            <textarea className="input resize-none" rows={2} value={form.storage_instructions} onChange={set('storage_instructions')} placeholder="e.g. Keep refrigerated" />
          </Field>
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          {/* Sub-section 1: Discount & Base Weight */}
          <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discount & Weight Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount (%)">
                <input className="input bg-white" type="number" min={0} max={100} value={form.discount_percent} onChange={set('discount_percent')} placeholder="% Optional" />
              </Field>
              <Field label="Base Weight">
                <select
                  className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 bg-white border border-gray-200"
                  value={form.price_base_weight}
                  onChange={set('price_base_weight')}
                >
                  {selectedWeights.length === 0 && (
                    <option value="">— select weight options first —</option>
                  )}
                  {selectedWeights.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Sub-section 2: Flavors & Prices */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3 mt-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flavors & Prices</h3>
            {selectedFlavors.length === 0 ? (
              <Field label="Price (₹)" required>
                <input className="input" type="number" min={0} value={form.selling_price} onChange={set('selling_price')} placeholder="₹ Price" required />
              </Field>
            ) : (
              <div className="space-y-3">
                <div className="pb-3 border-b border-gray-100">
                  <Field label="Default Flavor Selector">
                    <select
                      className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 bg-gray-50 border border-gray-200"
                      value={selectedFlavors[0] || ''}
                      onChange={(e) => {
                        const nextDefault = e.target.value
                        const oldDefault = selectedFlavors[0]
                        if (nextDefault === oldDefault) return

                        let rates: any = {}
                        try {
                          rates = typeof form.flavor_rates === 'string' ? JSON.parse(form.flavor_rates || '{}') : (form.flavor_rates || {})
                        } catch {
                          rates = {}
                        }

                        const nextDefaultPrice = rates[nextDefault]?.selling_price !== undefined ? rates[nextDefault].selling_price : form.selling_price
                        const oldDefaultPrice = form.selling_price

                        rates[oldDefault] = {
                          ...rates[oldDefault],
                          selling_price: parseFloat(oldDefaultPrice) || 0
                        }
                        delete rates[nextDefault]

                        const remaining = selectedFlavors.filter((f: string) => f !== nextDefault)
                        const nextFlavors = [nextDefault, ...remaining]

                        setForm((oldForm: any) => ({
                          ...oldForm,
                          flavor: nextFlavors.join(', '),
                          selling_price: String(nextDefaultPrice),
                          flavor_rates: JSON.stringify(rates)
                        }))
                      }}
                    >
                      {selectedFlavors.map((flv: string) => (
                        <option key={flv} value={flv}>
                          {flv}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="space-y-3.5">
                  {selectedFlavors.map((flv: string, idx: number) => {
                    const isDefault = idx === 0
                    let rates: any = {}
                    try {
                      rates = typeof form.flavor_rates === 'string' ? JSON.parse(form.flavor_rates || '{}') : (form.flavor_rates || {})
                    } catch {
                      rates = {}
                    }
                    const rate = rates[flv] || {}
                    const priceValue = isDefault ? form.selling_price : (rate.selling_price !== undefined ? rate.selling_price : '')

                    return (
                      <div key={flv} className="flex items-center gap-3">
                        <span className="font-bold text-sm text-gray-700 w-1/3 truncate">
                          🍰 {flv} {isDefault && <span className="text-xs text-primary-500 font-normal ml-1">(Default)</span>}
                        </span>
                        <div className="flex-1">
                          <input
                            type="number"
                            min={0}
                            placeholder="Price (₹)"
                            className="input text-sm w-full font-semibold"
                            value={priceValue}
                            onChange={(e) => {
                              if (isDefault) {
                                setForm((f: any) => ({ ...f, selling_price: e.target.value }))
                              } else {
                                updateFlavorRate(flv, 'selling_price', e.target.value)
                              }
                            }}
                            required
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Flags */}
        <Section title="Product Flags">
          <Toggle label="Available for order" value={form.is_available} onToggle={() => toggle('is_available')} />
          <Toggle label="Mark as Best Seller" value={form.is_best_seller} onToggle={() => toggle('is_best_seller')} />
          <Toggle label="Customizable" value={form.is_customizable} onToggle={() => toggle('is_customizable')} />
          <div className="pt-2">
            <Field label="Ready In (Preparation Time)">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <select
                    className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.3rem_center] bg-no-repeat pr-6"
                    value={parsePrepTime(form.preparation_time).hours}
                    onChange={(e) => {
                      const hrs = parseInt(e.target.value, 10)
                      const mins = parsePrepTime(form.preparation_time).minutes
                      setForm((f: any) => ({ ...f, preparation_time: formatPrepTime(hrs, mins) }))
                    }}
                  >
                    {Array.from({ length: 49 }, (_, i) => (
                      <option key={i} value={i}>
                        {i} {i === 1 ? 'hour' : 'hours'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 relative">
                  <select
                    className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.3rem_center] bg-no-repeat pr-6"
                    value={parsePrepTime(form.preparation_time).minutes}
                    onChange={(e) => {
                      const hrs = parsePrepTime(form.preparation_time).hours
                      const mins = parseInt(e.target.value, 10)
                      setForm((f: any) => ({ ...f, preparation_time: formatPrepTime(hrs, mins) }))
                    }}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {m} mins
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Field>
            {/* <Field label="Serves">
              <input
                className="input"
                value={form.serves}
                onChange={set('serves')}
                placeholder="e.g. 6-8 people"
              />
            </Field> */}
          </div>
        </Section>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.97 }}
          className="btn-primary w-full py-4 text-base"
        >
          {loading ? 'Saving…' : isEdit ? 'Update Product' : 'Save & Continue to Images'}
        </motion.button>

        {savedProductId && (
          <button type="button" onClick={handleDone} className="btn-secondary w-full mt-4 py-3">
            Done — Back to Products
          </button>
        )}
      </form>

      {/* Category Manager Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-lifted animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">Manage Categories</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryModal(false)
                  setNewCategoryName('')
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Close
              </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleAddCategorySubmit} className="space-y-3 bg-gray-50 p-3 rounded-2xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Add New Category</p>
              <div>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category Name"
                  className="input bg-white py-2 w-full"
                />
              </div>
              <button
                type="submit"
                disabled={creatingCategory}
                className="btn-primary w-full py-2 text-xs"
              >
                {creatingCategory ? 'Adding…' : 'Add Category'}
              </button>
            </form>

            {/* List and Delete Options */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[40vh]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Existing Categories</p>
              {categories && categories.length > 0 ? (
                categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors animate-pulse"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No categories found.</p>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Flavor Manager Modal */}
      {showFlavorManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-lifted animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">Manage Flavors</h3>
              <button
                type="button"
                onClick={() => {
                  setShowFlavorManager(false)
                  setNewFlavor('')
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Close
              </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleCreateFlavor} className="space-y-3 bg-gray-50 p-3 rounded-2xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Add New Flavor</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newFlavor}
                  onChange={(e) => setNewFlavor(e.target.value)}
                  placeholder="e.g. Red Velvet"
                  className="input bg-white py-2"
                />
                <button
                  type="submit"
                  disabled={creatingFlavor}
                  className="btn-primary py-2 px-4 text-xs"
                >
                  Add
                </button>
              </div>
            </form>

            {/* List and Delete Options */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[40vh]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Selectable Flavors</p>
              {dynamicFlavors.map((flv) => (
                <div key={flv} className="flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">{flv}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFlavor(flv)}
                    className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shape Manager Modal */}
      {showShapeManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-lifted animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">Manage Shapes</h3>
              <button
                type="button"
                onClick={() => {
                  setShowShapeManager(false)
                  setNewShape('')
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Close
              </button>
            </div>

            {/* Creation Form */}
            <form onSubmit={handleCreateShape} className="space-y-3 bg-gray-50 p-3 rounded-2xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Add New Shape</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newShape}
                  onChange={(e) => setNewShape(e.target.value)}
                  placeholder="e.g. Hexagon"
                  className="input bg-white py-2"
                />
                <button
                  type="submit"
                  disabled={creatingShape}
                  className="btn-primary py-2 px-4 text-xs"
                >
                  Add
                </button>
              </div>
            </form>

            {/* List and Delete Options */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[40vh]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Selectable Shapes</p>
              {dynamicShapes.map((shp) => (
                <div key={shp} className="flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">{shp}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteShape(shp)}
                    className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
