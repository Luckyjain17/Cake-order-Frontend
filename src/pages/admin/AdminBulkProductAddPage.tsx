import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Save, FileSpreadsheet, Braces, Undo2, ArrowLeft } from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import type { ProductImage } from '@/types'
import ImageUploader from '@/components/ImageUploader'

interface BulkRow {
  id: string
  name: string
  selling_price: string
  discount_percent: string
  category_id: string
  flavor: string
  shape: string
  short_description: string
  full_description: string
  price_base_weight: string
  weight_options: string[]
  preparation_time: string
  storage_instructions: string
  is_customizable: boolean
  is_available: boolean
  is_best_seller: boolean
  is_trending: boolean
  is_new_arrival: boolean
  images: ProductImage[]
  localFiles: { id: string; file: File }[]
  addWeightKg: number
  addWeightG: number
  flavor_rates: string
}

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

export default function AdminBulkProductAddPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<BulkRow[]>([
    {
      id: Math.random().toString(36).substring(7),
      name: '',
      selling_price: '',
      discount_percent: '0',
      category_id: '',
      flavor: '',
      shape: 'Round',
      short_description: '',
      full_description: '',
      price_base_weight: '500g',
      weight_options: ['500g', '1kg', '1.5kg', '2kg'],
      preparation_time: '3 hours',
      storage_instructions: 'Store in refrigerator. Best consumed within 2 days.',
      is_customizable: false,
      is_available: true,
      is_best_seller: false,
      is_trending: false,
      is_new_arrival: true,
      images: [],
      localFiles: [],
      addWeightKg: 0,
      addWeightG: 500,
      flavor_rates: '{}'
    }
  ])
  const [loading, setLoading] = useState(false)
  const [importJsonText, setImportJsonText] = useState('')
  const [showJsonModal, setShowJsonModal] = useState(false)
  const [importCsvText, setImportCsvText] = useState('')
  const [showCsvModal, setShowCsvModal] = useState(false)

  const queryClient = useQueryClient()
  const [showCategoryManager, setShowCategoryManager] = useState(false)
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

  const { data: categories } = useQuery<any[]>({
    queryKey: ['allCategories'],
    queryFn: () => api.get('/categories/all').then((r) => r.data)
  })

  const { data: filtersData } = useQuery<{ flavors: string[], cake_types: string[] }>({
    queryKey: ['filtersList'],
    queryFn: () => api.get('/products/filters-list').then((r) => r.data),
  })

  const dynamicFlavors = (filtersData?.flavors?.length
    ? Array.from(new Set([
        'Chocolate', 'Black Forest', 'Butterscotch', 'Vanilla', 'Pineapple',
        'Strawberry', 'Red Velvet', 'Blueberry', 'Mango', 'Coffee', 'Mixed Fruit'
      ].concat(filtersData.flavors)))
    : [
        'Chocolate', 'Black Forest', 'Butterscotch', 'Vanilla', 'Pineapple',
        'Strawberry', 'Red Velvet', 'Blueberry', 'Mango', 'Coffee', 'Mixed Fruit'
      ]).filter(f => !deletedFlavors.includes(f))

  const dynamicShapes = Array.from(new Set([...SHAPES, ...addedShapes])).filter(s => !deletedShapes.includes(s))

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Math.random().toString(36).substring(7),
        name: '',
        selling_price: '',
        discount_percent: '0',
        category_id: '',
        flavor: '',
        shape: 'Round',
        short_description: '',
        full_description: '',
        price_base_weight: '500g',
        weight_options: ['500g', '1kg', '1.5kg', '2kg'],
        preparation_time: '3 hours',
        storage_instructions: 'Store in refrigerator. Best consumed within 2 days.',
        is_customizable: false,
        is_available: true,
        is_best_seller: false,
        is_trending: false,
        is_new_arrival: true,
        images: [],
        localFiles: [],
        addWeightKg: 0,
        addWeightG: 500
      }
    ])
  }

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      toast.error('You must keep at least one product form.')
      return
    }
    const row = rows.find((r) => r.id === id)
    if (row) {
      row.images.forEach((img) => {
        if (typeof img.id === 'string' && img.id.startsWith('local-')) {
          URL.revokeObjectURL(img.url)
        }
      })
    }
    setRows(rows.filter((r) => r.id !== id))
  }

  const updateRow = (id: string, key: keyof BulkRow, val: any) => {
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === id ? { ...row, [key]: val } : row))
    )
  }

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      await api.post('/categories/', {
        name: newCategoryName.trim(),
        sort_order: categories ? categories.length : 0,
      })
      queryClient.invalidateQueries({ queryKey: ['allCategories'] })
      toast.success('Category created!')
      setNewCategoryName('')
      setShowCategoryManager(false)
    } catch {
      toast.error('Failed to create category')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleDeleteCategory = async (catId: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return
    try {
      await api.delete(`/categories/${catId}`)
      queryClient.invalidateQueries({ queryKey: ['allCategories'] })
      setRows((prevRows) =>
        prevRows.map((r) => (r.category_id === String(catId) ? { ...r, category_id: '' } : r))
      )
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
      const updatedDeleted = deletedFlavors.filter(f => f.toLowerCase() !== added.toLowerCase())
      setDeletedFlavors(updatedDeleted)
      localStorage.setItem('deleted_flavors', JSON.stringify(updatedDeleted))
      queryClient.invalidateQueries({ queryKey: ['filtersList'] })
      toast.success('Flavor added to list!')
      setNewFlavor('')
      setShowFlavorManager(false)
    } catch {
      toast.error('Failed to add Flavor')
    } finally {
      setCreatingFlavor(false)
    }
  }

  const handleDeleteFlavor = async (flavorName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${flavorName}"?`)) return
    try {
      await api.delete(`/products/flavors/${encodeURIComponent(flavorName)}`)
      queryClient.invalidateQueries({ queryKey: ['filtersList'] })
      const updatedDeleted = Array.from(new Set([...deletedFlavors, flavorName]))
      setDeletedFlavors(updatedDeleted)
      localStorage.setItem('deleted_flavors', JSON.stringify(updatedDeleted))
      setRows((prevRows) =>
        prevRows.map((r) => {
          const flvs = r.flavor.split(',').map(x => x.trim()).filter(Boolean)
          if (flvs.includes(flavorName)) {
            const next = flvs.filter(x => x !== flavorName).join(', ')
            return { ...r, flavor: next }
          }
          return r
        })
      )
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
      toast.success('Shape added to list!')
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
    setRows((prevRows) =>
      prevRows.map((r) => (r.shape === shapeName ? { ...r, shape: '' } : r))
    )
    toast.success('Shape deleted')
  }

  const handleAddWeight = (rowId: string) => {
    const row = rows.find(r => r.id === rowId)
    if (!row) return
    const w = buildWeight(row.addWeightKg, row.addWeightG)
    if (row.weight_options.includes(w)) {
      toast.error('Weight option already exists')
      return
    }
    const next = [...row.weight_options, w].sort((a, b) => parseKg(a) - parseKg(b))
    setRows(prevRows =>
      prevRows.map((r) => {
        if (r.id !== rowId) return r
        let baseWeight = r.price_base_weight
        if (!next.includes(baseWeight)) baseWeight = next[0] || ''
        return { ...r, weight_options: next, price_base_weight: baseWeight }
      })
    )
  }

  const handleDeleteWeight = (rowId: string, w: string) => {
    setRows(prevRows =>
      prevRows.map((r) => {
        if (r.id !== rowId) return r
        const next = r.weight_options.filter(x => x !== w)
        let baseWeight = r.price_base_weight
        if (!next.includes(baseWeight)) baseWeight = next[0] || ''
        return { ...r, weight_options: next, price_base_weight: baseWeight }
      })
    )
  }

  const toggleFlavor = (rowId: string, flavorName: string) => {
    setRows(prevRows =>
      prevRows.map((r) => {
        if (r.id !== rowId) return r
        const current = r.flavor ? r.flavor.split(',').map(x => x.trim()).filter(Boolean) : []
        const next = current.includes(flavorName) ? current.filter(x => x !== flavorName) : [...current, flavorName]
        return { ...r, flavor: next.join(', ') }
      })
    )
  }

  const updateBulkRowFlavorRate = (rowId: string, flavor: string, key: 'selling_price' | 'original_price', value: string) => {
    setRows(prevRows =>
      prevRows.map((r) => {
        if (r.id !== rowId) return r
        let rates: any = {}
        try {
          rates = typeof r.flavor_rates === 'string' ? JSON.parse(r.flavor_rates || '{}') : (r.flavor_rates || {})
        } catch {
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
        return { ...r, flavor_rates: JSON.stringify(rates) }
      })
    )
  }

  const toggleShape = (rowId: string, shapeName: string) => {
    setRows(prevRows =>
      prevRows.map((r) => {
        if (r.id !== rowId) return r
        return { ...r, shape: r.shape === shapeName ? '' : shapeName }
      })
    )
  }

  const handleSubmit = async () => {
    const invalid = rows.some((r) => !r.name.trim() || !r.selling_price)
    if (invalid) {
      toast.error('Please enter Name and Selling Price for all products.')
      return
    }

    setLoading(true)
    try {
      const payload = rows.map((r) => {
        const sellingPrice = parseFloat(r.selling_price) || 0
        const discount = parseFloat(r.discount_percent) || 0
        let originalPrice = sellingPrice
        if (discount > 0 && discount < 100) {
          originalPrice = sellingPrice / (1 - discount / 100)
        }

        return {
          name: r.name.trim(),
          short_description: r.short_description.trim() || undefined,
          full_description: r.full_description.trim() || undefined,
          category_id: r.category_id ? parseInt(r.category_id) : null,
          flavor: r.flavor.trim() || null,
          shape: r.shape || null,
          original_price: originalPrice,
          selling_price: sellingPrice,
          discount_percent: discount,
          price_base_weight: r.price_base_weight,
          weight_options: JSON.stringify(r.weight_options),
          preparation_time: r.preparation_time,
          storage_instructions: r.storage_instructions,
          is_customizable: r.is_customizable,
          is_available: r.is_available,
          is_best_seller: r.is_best_seller,
          is_trending: r.is_trending,
          is_new_arrival: r.is_new_arrival,
          is_eggless: true,
          flavor_rates: r.flavor_rates || '{}'
        }
      })

      const { data: createdProducts } = await api.post('/products/bulk', payload)

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const product = createdProducts[i]

        const filesToUpload = row.images
          .filter((img) => {
            const imgId = img.id as any
            return typeof imgId === 'string' && imgId.startsWith('local-')
          })
          .map((img) => row.localFiles.find((lf) => lf.id === (img.id as any))?.file)
          .filter((file): file is File => !!file)

        if (filesToUpload.length > 0 && product?.id) {
          const formData = new FormData()
          filesToUpload.forEach((file) => {
            formData.append('files', file)
          })
          formData.append('image_type', 'other')

          try {
            toast.loading(`Uploading images for ${product.name}...`, { id: `upload-${product.id}` })
            const { data: uploadedImages } = await api.post(`/images/upload/${product.id}`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
            if (uploadedImages.length > 0) {
              await api.patch(`/images/${uploadedImages[0].id}/set-cover`).catch(() => {})
            }
            toast.success(`Uploaded images for ${product.name}!`, { id: `upload-${product.id}` })
          } catch (uploadError) {
            console.error(`Failed to upload images for product ${product.id}`, uploadError)
            toast.error(`Failed to upload images for: ${product.name}`, { id: `upload-${product.id}` })
          }
        }
      }

      toast.success(`${rows.length} products created successfully!`)
      
      rows.forEach((r) => {
        r.images.forEach((img) => {
          if (typeof img.id === 'string' && img.id.startsWith('local-')) {
            URL.revokeObjectURL(img.url)
          }
        })
      })

      navigate('/admin/products')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save products')
    } finally {
      setLoading(false)
    }
  }

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText)
      if (!Array.isArray(parsed)) {
        toast.error('JSON input must be a list / array of objects')
        return
      }

      const imported: BulkRow[] = parsed.map((item: any) => {
        const wOpts = Array.isArray(item.weight_options)
          ? item.weight_options
          : typeof item.weight_options === 'string'
            ? JSON.parse(item.weight_options)
            : ['500g', '1kg', '1.5kg', '2kg']

        return {
          id: Math.random().toString(36).substring(7),
          name: String(item.name || ''),
          selling_price: String(item.selling_price || item.price || ''),
          discount_percent: String(item.discount_percent || '0'),
          category_id: String(item.category_id || ''),
          flavor: String(item.flavor || ''),
          shape: String(item.shape || 'Round'),
          short_description: String(item.short_description || ''),
          full_description: String(item.full_description || ''),
          price_base_weight: String(item.price_base_weight || '500g'),
          weight_options: wOpts,
          preparation_time: String(item.preparation_time || '3 hours'),
          storage_instructions: String(item.storage_instructions || 'Store in refrigerator. Best consumed within 2 days.'),
          is_customizable: Boolean(item.is_customizable ?? false),
          is_available: Boolean(item.is_available ?? true),
          is_best_seller: Boolean(item.is_best_seller ?? false),
          is_trending: Boolean(item.is_trending ?? false),
          is_new_arrival: Boolean(item.is_new_arrival ?? true),
          images: [],
          localFiles: [],
          addWeightKg: 0,
          addWeightG: 500,
          flavor_rates: typeof item.flavor_rates === 'object' ? JSON.stringify(item.flavor_rates) : String(item.flavor_rates || '{}')
        }
      })

      setRows(imported)
      toast.success(`Successfully loaded ${imported.length} rows from JSON!`)
      setShowJsonModal(false)
      setImportJsonText('')
    } catch {
      toast.error('Invalid JSON syntax. Please check your data.')
    }
  }

  const handleImportCsv = () => {
    try {
      const lines = importCsvText.split(/\r?\n/).filter((l) => l.trim() !== '')
      if (lines.length < 2) {
        toast.error('CSV should have a header line followed by product values')
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
      const nameIndex = headers.indexOf('name')
      const priceIndex = headers.indexOf('price') !== -1 ? headers.indexOf('price') : headers.indexOf('selling_price')
      const discountIndex = headers.indexOf('discount') !== -1 ? headers.indexOf('discount') : headers.indexOf('discount_percent')
      const flavorIndex = headers.indexOf('flavor') !== -1 ? headers.indexOf('flavor') : headers.indexOf('flavors')
      const flavorRatesIndex = headers.indexOf('flavor_rates')
      const shapeIndex = headers.indexOf('shape')
      const descIndex = headers.indexOf('description') !== -1 ? headers.indexOf('description') : headers.indexOf('short_description')

      if (nameIndex === -1 || priceIndex === -1) {
        toast.error('CSV headers must at least contain: "name" and "price"')
        return
      }

      const imported: BulkRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',')
        const values = matches.map((v) => v.replace(/^"|"$/g, '').trim())

        if (values.length === 0 || !values[nameIndex]) continue

        imported.push({
          id: Math.random().toString(36).substring(7),
          name: values[nameIndex] || '',
          selling_price: values[priceIndex] || '',
          discount_percent: discountIndex !== -1 ? values[discountIndex] || '0' : '0',
          category_id: '',
          flavor: flavorIndex !== -1 ? values[flavorIndex] || '' : '',
          shape: shapeIndex !== -1 ? values[shapeIndex] || 'Round' : 'Round',
          short_description: descIndex !== -1 ? values[descIndex] || '' : '',
          full_description: '',
          price_base_weight: '500g',
          weight_options: ['500g', '1kg', '1.5kg', '2kg'],
          preparation_time: '3 hours',
          storage_instructions: 'Store in refrigerator. Best consumed within 2 days.',
          is_customizable: false,
          is_available: true,
          is_best_seller: false,
          is_trending: false,
          is_new_arrival: true,
          images: [],
          localFiles: [],
          addWeightKg: 0,
          addWeightG: 500,
          flavor_rates: flavorRatesIndex !== -1 ? values[flavorRatesIndex] || '{}' : '{}'
        })
      }

      setRows(imported)
      toast.success(`Successfully loaded ${imported.length} rows from CSV!`)
      setShowCsvModal(false)
      setImportCsvText('')
    } catch {
      toast.error('Failed to parse CSV. Please try copy-pasting standard comma-separated text.')
    }
  }

  return (
    <div className="p-4 pb-12 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-primary-500 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Bulk Product Add</h1>
            <p className="text-xs text-gray-400 mt-0.5">Add multiple cakes to your catalog in one go</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex flex-wrap gap-1.5 border-r border-gray-200 pr-2 mr-2">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-gray-700 bg-gray-55 border border-gray-250 hover:bg-gray-100"
            >
              + Categories
            </button>
            <button
              onClick={() => setShowFlavorManager(true)}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-gray-700 bg-gray-55 border border-gray-250 hover:bg-gray-100"
            >
              + Flavors
            </button>
            <button
              onClick={() => setShowShapeManager(true)}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-semibold text-gray-700 bg-gray-55 border border-gray-250 hover:bg-gray-100"
            >
              + Shapes
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJsonModal(true)}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
            >
              <Braces size={14} /> Import JSON
            </button>
            <button
              onClick={() => setShowCsvModal(true)}
              className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-bold"
            >
              <FileSpreadsheet size={14} /> Import CSV
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {rows.map((row, index) => (
          <div key={row.id} className="relative bg-white rounded-3xl border border-gray-150 p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                Cake Form #{index + 1} {row.name ? `- ${row.name}` : ''}
              </h2>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold"
                >
                  <Trash2 size={15} /> Delete Form
                </button>
              )}
            </div>

            <div className="card p-4 space-y-2">
              <label className="text-sm font-bold text-gray-700">Product Name <span className="text-red-400">*</span></label>
              <input
                className="input text-lg font-semibold"
                value={row.name}
                onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                placeholder="e.g. Chocolate Truffle Cake"
                required
              />
            </div>

            <Section title="Product Images">
              <ImageUploader
                productId={undefined}
                images={row.images}
                onImagesChange={(imgs) => updateRow(row.id, 'images', imgs)}
                localFiles={row.localFiles}
                onLocalFilesChange={(files) => updateRow(row.id, 'localFiles', files)}
              />
            </Section>

            <Section title="Description Details">
              <Field label="Short Description">
                <input
                  className="input"
                  value={row.short_description}
                  onChange={(e) => updateRow(row.id, 'short_description', e.target.value)}
                  placeholder="One-line description"
                />
              </Field>
              <Field label="Full Description">
                <textarea
                  className="input resize-none"
                  rows={4}
                  value={row.full_description}
                  onChange={(e) => updateRow(row.id, 'full_description', e.target.value)}
                  placeholder="Detailed description…"
                />
              </Field>
            </Section>

            <Section title="Cake Details">
              <Field label="Category">
                <div className="flex gap-2">
                  <select
                    className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 bg-white"
                    value={row.category_id}
                    onChange={(e) => updateRow(row.id, 'category_id', e.target.value)}
                  >
                    <option value="">Select category</option>
                    {categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryManager(true)}
                    className="btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
                  >
                    + Add / Manage
                  </button>
                </div>
              </Field>

              <Field label="Flavors (Select multiple)">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50/50 rounded-2xl border border-gray-150/70">
                    {dynamicFlavors.map((flv) => {
                      const active = (row.flavor ? row.flavor.split(',').map(x => x.trim()).filter(Boolean) : []).includes(flv)
                      return (
                        <button
                          key={flv}
                          type="button"
                          onClick={() => toggleFlavor(row.id, flv)}
                          className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                            active
                              ? 'border-primary-500 bg-primary-50 text-primary-500 shadow-sm'
                              : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                          }`}
                        >
                          {flv}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400 font-semibold truncate max-w-[70%]">
                      Selected: {row.flavor || 'None'}
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
                        onClick={() => toggleShape(row.id, s)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          row.shape === s ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400 font-semibold truncate max-w-[70%]">
                      Selected Shape: {row.shape || 'None'}
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
            </Section>

            <Section title="Weight Options">
              <div className="flex gap-2 items-center mb-3">
                <select
                  className="input font-semibold flex-1 text-sm bg-white"
                  value={row.addWeightKg}
                  onChange={(e) => updateRow(row.id, 'addWeightKg', parseInt(e.target.value))}
                >
                  {KG_OPTIONS.map((kg) => (
                    <option key={kg} value={kg}>{kg} kg</option>
                  ))}
                </select>
                <span className="text-gray-400 font-bold text-sm">+</span>
                <select
                  className="input font-semibold flex-1 text-sm bg-white"
                  value={row.addWeightG}
                  onChange={(e) => updateRow(row.id, 'addWeightG', parseInt(e.target.value))}
                >
                  {GRAM_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g} g</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddWeight(row.id)}
                  className="btn-primary py-2 px-4 text-xs font-bold flex-shrink-0 animate-scale-in"
                >
                  Add Option
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {row.weight_options.map((w) => (
                  <div key={w} className="flex items-center gap-1 bg-gray-50 border border-gray-205 px-3 py-1 rounded-xl text-sm font-semibold text-gray-600">
                    {w}
                    <button
                      type="button"
                      onClick={() => handleDeleteWeight(row.id, w)}
                      className="text-gray-400 hover:text-red-500 font-bold ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <Field label="Base Price Weight (Price set below will be for this weight)">
                <select
                  className="input appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 bg-white"
                  value={row.price_base_weight}
                  onChange={(e) => updateRow(row.id, 'price_base_weight', e.target.value)}
                >
                  {row.weight_options.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </Field>
            </Section>

            <Section title="Pricing">
              {/* Discount */}
              <div className="bg-gray-50/50 p-3.5 rounded-xl border border-gray-100 mb-3">
                <Field label="Discount Percent (%)">
                  <input
                    className="input bg-white font-semibold"
                    type="number"
                    min="0"
                    max="100"
                    value={row.discount_percent}
                    onChange={(e) => updateRow(row.id, 'discount_percent', e.target.value)}
                    placeholder="e.g. 10"
                  />
                </Field>
              </div>

              {/* Flavors & Prices */}
              <div className="bg-white p-3.5 rounded-xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flavors & Prices</h4>
                {selectedFlavors.length === 0 ? (
                  <Field label="Selling Price (₹)" required>
                    <input
                      className="input font-semibold"
                      type="number"
                      required
                      value={row.selling_price}
                      onChange={(e) => updateRow(row.id, 'selling_price', e.target.value)}
                      placeholder="e.g. 600"
                    />
                  </Field>
                ) : (
                  <div className="space-y-3">
                    <div className="pb-2.5 border-b border-gray-100">
                      <Field label="Default Flavor">
                        <select
                          className="input bg-white cursor-pointer"
                          value={selectedFlavors[0] || ''}
                          onChange={(e) => {
                            const nextDefault = e.target.value
                            const oldDefault = selectedFlavors[0]
                            if (nextDefault === oldDefault) return

                            let rates: any = {}
                            try {
                              rates = typeof row.flavor_rates === 'string' ? JSON.parse(row.flavor_rates || '{}') : (row.flavor_rates || {})
                            } catch {
                              rates = {}
                            }

                            const nextDefaultPrice = rates[nextDefault]?.selling_price !== undefined ? rates[nextDefault].selling_price : row.selling_price
                            const oldDefaultPrice = row.selling_price

                            rates[oldDefault] = {
                              ...rates[oldDefault],
                              selling_price: parseFloat(oldDefaultPrice) || 0
                            }
                            delete rates[nextDefault]

                            const remaining = selectedFlavors.filter((f) => f !== nextDefault)
                            const nextFlavors = [nextDefault, ...remaining]

                            setRows(prevRows =>
                              prevRows.map(r => {
                                if (r.id !== row.id) return r
                                return {
                                  ...r,
                                  flavor: nextFlavors.join(', '),
                                  selling_price: String(nextDefaultPrice),
                                  flavor_rates: JSON.stringify(rates)
                                }
                              })
                            )
                          }}
                        >
                          {selectedFlavors.map((flv) => (
                            <option key={flv} value={flv}>
                              {flv}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <div className="space-y-3">
                      {selectedFlavors.map((flv, idx) => {
                        const isDefault = idx === 0
                        let rates: any = {}
                        try {
                          rates = typeof row.flavor_rates === 'string' ? JSON.parse(row.flavor_rates || '{}') : (row.flavor_rates || {})
                        } catch {
                          rates = {}
                        }
                        const rate = rates[flv] || {}
                        const priceValue = isDefault ? row.selling_price : (rate.selling_price !== undefined ? rate.selling_price : '')

                        return (
                          <div key={flv} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-600 w-24 truncate">
                              🍰 {flv} {isDefault && <span className="text-[10px] text-primary-500 font-normal ml-0.5">(Def)</span>}
                            </span>
                            <input
                              type="number"
                              min={0}
                              placeholder="Price (₹)"
                              className="input text-xs flex-1 py-1 font-semibold"
                              value={priceValue}
                              onChange={(e) => {
                                if (isDefault) {
                                  updateRow(row.id, 'selling_price', e.target.value)
                                } else {
                                  updateBulkRowFlavorRate(row.id, flv, 'selling_price', e.target.value)
                                }
                              }}
                              required
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Additional Details">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Prep Time Hours">
                  <select
                    className="input bg-white"
                    value={parsePrepTime(row.preparation_time).hours}
                    onChange={(e) => {
                      const mins = parsePrepTime(row.preparation_time).minutes
                      const nextVal = formatPrepTime(parseInt(e.target.value), mins)
                      updateRow(row.id, 'preparation_time', nextVal)
                    }}
                  >
                    {Array.from({ length: 25 }, (_, idx) => (
                      <option key={idx} value={idx}>{idx} hours</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prep Time Minutes">
                  <select
                    className="input bg-white"
                    value={parsePrepTime(row.preparation_time).minutes}
                    onChange={(e) => {
                      const hrs = parsePrepTime(row.preparation_time).hours
                      const nextVal = formatPrepTime(hrs, parseInt(e.target.value))
                      updateRow(row.id, 'preparation_time', nextVal)
                    }}
                  >
                    {[0, 15, 30, 45].map((mins) => (
                      <option key={mins} value={mins}>{mins} mins</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Storage Instructions">
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={row.storage_instructions}
                  onChange={(e) => updateRow(row.id, 'storage_instructions', e.target.value)}
                  placeholder="e.g. Store in refrigerator..."
                />
              </Field>
            </Section>

            <Section title="Availability & Settings">
              <div className="divide-y divide-gray-100">
                <Toggle
                  label="Customizable (Eggless / Message)"
                  value={row.is_customizable}
                  onToggle={() => updateRow(row.id, 'is_customizable', !row.is_customizable)}
                />
                <Toggle
                  label="Available for Sale"
                  value={row.is_available}
                  onToggle={() => updateRow(row.id, 'is_available', !row.is_available)}
                />
                <Toggle
                  label="Mark as Best Seller"
                  value={row.is_best_seller}
                  onToggle={() => updateRow(row.id, 'is_best_seller', !row.is_best_seller)}
                />

              </div>
            </Section>
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/70 border border-gray-150 shadow-lifted">
        <button
          onClick={addRow}
          className="btn-secondary py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-1.5"
        >
          <Plus size={16} /> Add Another Cake Form
        </button>
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs text-gray-400 font-bold">
            {rows.length} {rows.length === 1 ? 'Cake' : 'Cakes'} total
          </span>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary py-2.5 px-6 text-sm font-bold flex items-center justify-center gap-1.5 shadow-md"
          >
            <Save size={16} />
            {loading ? 'Creating…' : 'Save All Cakes'}
          </button>
        </div>
      </div>

      {showJsonModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 w-full max-w-lg space-y-4 shadow-lifted animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base flex items-center gap-1.5">
                <Braces size={18} className="text-primary-500" />
                Import Products via JSON
              </h3>
              <button
                onClick={() => {
                  setShowJsonModal(false)
                  setImportJsonText('')
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <textarea
                className="input text-xs font-mono font-semibold"
                rows={6}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder="[{ ... }, { ... }]"
              />
              <button
                onClick={handleImportJson}
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Import & Add Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-lifted animate-scale-in flex flex-col max-h-[85vh] z-50">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">Manage Categories</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryManager(false)
                  setNewCategoryName('')
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-3 bg-gray-50 p-3 rounded-2xl">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Add New Category</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Cupcakes"
                  className="input bg-white py-2"
                />
                <button
                  type="submit"
                  disabled={creatingCategory}
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[40vh]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Selectable Categories</p>
              {categories && categories.length > 0 ? (
                categories.map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
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

      {showCsvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-5 w-full max-w-lg space-y-4 shadow-lifted animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base flex items-center gap-1.5">
                <FileSpreadsheet size={18} className="text-primary-500" />
                Import Products via CSV
              </h3>
              <button
                onClick={() => {
                  setShowCsvModal(false)
                  setImportCsvText('')
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-gray-400">
                Paste CSV text with column headers: <code className="font-mono text-primary-500">name, price, discount, flavor, shape, description</code>
              </p>
              <textarea
                className="input text-xs font-mono font-semibold"
                rows={7}
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                placeholder="name,price,discount,flavor,shape,description&#10;Strawberry Shortcake,550,5,Strawberry,Round,Sweet strawberry delight&#10;Vanilla Oreo,600,0,Vanilla,Round,Oreos inside vanilla cream"
              />
              <button
                onClick={handleImportCsv}
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Import & Add Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {showFlavorManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-lifted animate-scale-in flex flex-col max-h-[85vh] z-50">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">Manage Flavors</h3>
              <button
                type="button"
                onClick={() => {
                  setShowFlavorManager(false)
                  setNewFlavor('')
                }}
                className="text-gray-400 hover:text-gray-650 text-sm font-medium"
              >
                Close
              </button>
            </div>

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
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[40vh]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Selectable Flavors</p>
              {dynamicFlavors.map((flv) => (
                <div key={flv} className="flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">{flv}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFlavor(flv)}
                    className="text-red-400 hover:text-red-655 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showShapeManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-lifted animate-scale-in flex flex-col max-h-[85vh] z-50">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-base">Manage Shapes</h3>
              <button
                type="button"
                onClick={() => {
                  setShowShapeManager(false)
                  setNewShape('')
                }}
                className="text-gray-400 hover:text-gray-650 text-sm font-medium"
              >
                Close
              </button>
            </div>

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
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[40vh]">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Selectable Shapes</p>
              {dynamicShapes.map((shp) => (
                <div key={shp} className="flex items-center justify-between bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm">
                  <span className="text-sm font-semibold text-gray-700">{shp}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteShape(shp)}
                    className="text-red-400 hover:text-red-655 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
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
