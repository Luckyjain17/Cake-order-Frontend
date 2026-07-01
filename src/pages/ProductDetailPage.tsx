import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Clock, Users, ChefHat, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import type { Product } from '@/types'
import ImageGallery from '@/components/ImageGallery'
import { useCart } from '@/context/CartContext'
import ProductCarousel from '@/components/ProductCarousel'
import { useQuery as useQ } from '@tanstack/react-query'

function getWeightMultiplier(selected: string, base: string = '500g'): number {
  const parseKg = (str: string): number => {
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
  return parseKg(selected) / parseKg(base)
}

const WEIGHTS = ['500g', '1kg', '1.5kg', '2kg', '3kg']

const CUSTOM_WEIGHT_OPTIONS = [
  '1kg', '1.5kg', '2kg', '2.5kg', '3kg', '3.5kg', '4kg', '4.5kg',
  '5kg', '5.5kg', '6kg', '6.5kg', '7kg', '7.5kg', '8kg', '8.5kg',
  '9kg', '9.5kg', '10kg'
]

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { addItem } = useCart()
  const [selectedWeight, setSelectedWeight] = useState('1kg')
  const [qty, setQty] = useState(1)
  const [isCustomWeight, setIsCustomWeight] = useState(false)
  const [customWeight, setCustomWeight] = useState('3.5kg')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const productQuery = useQuery<Product>({
    queryKey: ['product', slug],
    queryFn: () => {
      const isId = slug && !isNaN(Number(slug))
      const url = isId ? `/products/id/${slug}` : `/products/${slug}`
      return api.get(url).then((r) => r.data)
    },
    enabled: !!slug,
  })
  const product = productQuery.data
  const isLoading = productQuery.isLoading

  const { data: related } = useQ({
    queryKey: ['relatedProducts', product?.category_id],
    queryFn: () =>
      api.get('/products/', { params: { category_id: product!.category_id, per_page: 8 } }).then((r) => r.data),
    enabled: !!product?.category_id,
  })

  useEffect(() => {
    if (product) {
      const w = product.weight_options ? JSON.parse(product.weight_options) : WEIGHTS
      if (w.length > 0) {
        setSelectedWeight(w[0])
      }
    }
  }, [product])

  if (isLoading) {
    return (
      <div className="page-container py-6 pb-nav space-y-4">
        <div className="skeleton aspect-square rounded-3xl" />
        <div className="skeleton h-8 w-3/4 rounded-xl" />
        <div className="skeleton h-5 w-1/2 rounded-xl" />
      </div>
    )
  }

  if (!product) return null

  const weights = product.weight_options
    ? JSON.parse(product.weight_options)
    : WEIGHTS

  const displayWeights = (product.is_customizable && !weights.includes('Custom Weight'))
    ? [...weights, 'Custom Weight']
    : weights

  const multiplier = getWeightMultiplier(selectedWeight, product.price_base_weight)
  const multipliedSellingPrice = product.selling_price * multiplier
  const multipliedOriginalPrice = product.original_price * multiplier

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.cover_image?.thumbnail_url || product.cover_image?.url,
      weight: selectedWeight,
      price: multipliedSellingPrice,
      qty,
    })
    toast.success(`Added ${qty} × ${product.name} (${selectedWeight}) 🎂`)
  }

  return (
    <div className="pb-nav">
      <div className="page-container py-4 space-y-6">
        {/* Image Gallery */}
        <ImageGallery images={product.images} />

        {/* Product Info */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {product.is_best_seller && <span className="badge-pink">⭐ Best Seller</span>}
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>
          {product.short_description && (
            <p className="text-gray-500 text-sm">{product.short_description}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">₹{multipliedSellingPrice}</span>
            {multipliedOriginalPrice > multipliedSellingPrice && (
              <>
                <span className="text-gray-400 line-through text-lg">₹{multipliedOriginalPrice}</span>
                <span className="badge-pink">{Math.round(product.discount_percent)}% off</span>
              </>
            )}
          </div>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Clock, label: 'Ready in', value: product.preparation_time || '24 hrs' },
            { icon: ChefHat, label: 'Type', value: product.cake_type || 'Cream Cake' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
              <Icon size={18} className="text-primary-400 mx-auto mb-1" />
              <p className="text-[10px] text-gray-400">{label}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Weight selector */}
        <div>
          <p className="label">Weight</p>
          <div className="flex flex-wrap gap-2">
            {displayWeights.map((w: string) => {
              const isSelected = w === 'Custom Weight' ? isCustomWeight : (selectedWeight === w && !isCustomWeight)
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    if (w === 'Custom Weight') {
                      setIsCustomWeight(true)
                      setSelectedWeight(customWeight)
                    } else {
                      setIsCustomWeight(false)
                      setSelectedWeight(w)
                    }
                  }}
                  className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-500'
                      : 'border-gray-200 text-gray-600'
                    }`}
                >
                  {w}
                </button>
              )
            })}
          </div>

          {/* Custom Weight Select Dropdown */}
          {isCustomWeight && (
            <div className="mt-3 relative">
              <label className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide mb-1">
                Select Custom Weight
              </label>

              {/* Custom Selector Button */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-left font-semibold text-gray-800 flex justify-between items-center shadow-sm hover:border-primary-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <span>{customWeight}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Options Popover */}
              {isDropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div className="fixed inset-0 z-20" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-lifted p-1 z-30 animate-fade-in select-none">
                    {CUSTOM_WEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setCustomWeight(opt)
                          setSelectedWeight(opt)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-all ${customWeight === opt
                            ? 'bg-primary-50 text-primary-600 font-bold'
                            : 'text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Qty + Cart */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 rounded-xl bg-white shadow-soft font-bold text-gray-700 flex items-center justify-center"
            >
              −
            </button>
            <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="w-9 h-9 rounded-xl bg-white shadow-soft font-bold text-primary-500 flex items-center justify-center"
            >
              +
            </button>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleAddToCart}
            className="btn-primary flex-1"
          >
            <ShoppingBag size={18} />
            Add to Cart — ₹{(multipliedSellingPrice * qty).toLocaleString()}
          </motion.button>
        </div>

        {/* Full description */}
        {product.full_description && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">About this Cake</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{product.full_description}</p>
          </div>
        )}

        {/* Ingredients */}
        {/* {product.ingredients && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Ingredients</h3>
            <p className="text-sm text-gray-500">{product.ingredients}</p>
          </div>
        )} */}

        {/* Storage */}
        {product.storage_instructions && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <h3 className="font-semibold text-blue-700 mb-1 text-sm">Storage Instructions</h3>
            <p className="text-sm text-blue-600">{product.storage_instructions}</p>
          </div>
        )}

        {/* Related products */}
        {related && related.items?.length > 0 && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <ProductCarousel
              title="You may also like"
              products={related.items.filter((p: { id: number }) => p.id !== product.id).slice(0, 8)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
