import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Clock, Users, ChefHat, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api, { getImageUrl } from '@/lib/api'
import type { Product } from '@/types'
import ImageGallery from '@/components/ImageGallery'
import { useCart } from '@/context/CartContext'
import ProductCarousel from '@/components/ProductCarousel'
import { useQuery as useQ } from '@tanstack/react-query'

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

function getWeightMultiplier(selected: string, base: string = '500g'): number {
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

  const { data: storeSetting } = useQ({
    queryKey: ['settings', 'store_status'],
    queryFn: () => api.get('/settings/store_status').then((r) => r.data).catch(() => null),
  })

  const { data: reopenSetting } = useQ({
    queryKey: ['settings', 'store_reopen_time'],
    queryFn: () => api.get('/settings/store_reopen_time').then((r) => r.data).catch(() => null),
  })
  const reopenTime = reopenSetting?.value

  const isClosed = (() => {
    if (storeSetting?.value !== 'closed') return false
    if (!reopenTime) return true
    const reopenDate = new Date(reopenTime)
    if (isNaN(reopenDate.getTime())) return true
    return new Date() < reopenDate
  })()

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
        const maxW = w.reduce((max: number, currentStr: string) => {
          const val = parseKg(currentStr)
          return val > max ? val : max
        }, 0)
        const firstLarger = CUSTOM_WEIGHT_OPTIONS.find((opt) => parseKg(opt) > maxW)
        if (firstLarger) {
          setCustomWeight(firstLarger)
        } else {
          setCustomWeight('3.5kg')
        }
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

  const maxWeightKg = weights.reduce((max: number, w: string) => {
    const kg = parseKg(w)
    return kg > max ? kg : max
  }, 0)

  const filteredCustomWeightOptions = CUSTOM_WEIGHT_OPTIONS.filter((opt) => {
    return parseKg(opt) > maxWeightKg
  })

  const multiplier = getWeightMultiplier(selectedWeight, product.price_base_weight)
  const multipliedSellingPrice = product.selling_price * multiplier
  const multipliedOriginalPrice = product.original_price * multiplier

  const handleAddToCart = () => {
    if (isClosed) return
    const coverImg = product.cover_image || product.images?.[0]
    const imageUrl = getImageUrl(coverImg?.thumbnail_url || coverImg?.url) || ''

    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      price: multipliedSellingPrice,
      image_url: imageUrl,
      qty,
      weight: selectedWeight,
    })
    toast.success('Added to cart')
  }

  if (isLoading) {
    return (
      <div className="page-container py-6 pb-nav space-y-4">
        <div className="skeleton aspect-square rounded-3xl" />
        <div className="skeleton h-8 w-3/4 rounded-xl" />
        <div className="skeleton h-5 w-1/2 rounded-xl" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page-container py-12 text-center text-gray-500 font-medium">
        Product not found
      </div>
    )
  }

  return (
    <div className="pb-nav">
      <div className="page-container py-6 max-w-lg mx-auto space-y-6">
        {/* Images */}
        <div className="aspect-square rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 shadow-soft">
          <ImageGallery images={product.images || []} />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>
              <p className="text-sm text-gray-400 mt-1">{product.short_description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1.5">
                  {product.original_price > product.selling_price && (
                    <span className="text-sm text-gray-400 line-through font-medium">
                      ₹{multipliedOriginalPrice.toLocaleString()}
                    </span>
                  )}
                  <span className="text-2xl font-black text-primary-500 tracking-tight font-sans">
                    ₹{multipliedSellingPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {product.original_price > product.selling_price && (
                    <span className="badge-pink text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg uppercase tracking-wider">
                      {Math.round(product.discount_percent)}% OFF
                    </span>
                  )}
                  {product.price_base_weight && (
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      Base: {product.price_base_weight}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Clock, label: 'Ready in', value: product.preparation_time || '3 hrs' },
              // { icon: ChefHat, label: 'Type', value: product.cake_type || 'Cream Cake' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                <Icon size={18} className="text-primary-400 mx-auto mb-1" />
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-gray-700 mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Customizations Section */}
          <div className="space-y-3">
            {/* Weight Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Weight</label>
              <div className="flex flex-wrap gap-2">
                {displayWeights.map((w: string) => {
                  const isSelected = selectedWeight === w || (w === 'Custom Weight' && isCustomWeight)
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        if (w === 'Custom Weight') {
                          setIsCustomWeight(true)
                          setSelectedWeight(customWeight)
                        } else {
                          setSelectedWeight(w)
                          setIsCustomWeight(false)
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

              {/* Custom Weight selector Dropdown */}
              {isCustomWeight && (
                <>
                  <div className="relative mt-2">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 flex justify-between items-center"
                    >
                      <span>Custom: {customWeight}</span>
                      <ChevronDown size={16} />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-150 rounded-xl shadow-lifted z-10 max-h-40 overflow-y-auto p-1 space-y-1">
                        {filteredCustomWeightOptions.map((opt) => (
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
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Qty + Cart */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-white shadow-soft font-bold text-gray-700 flex items-center justify-center"
                disabled={isClosed}
              >
                −
              </button>
              <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-9 h-9 rounded-xl bg-white shadow-soft font-bold text-primary-500 flex items-center justify-center"
                disabled={isClosed}
              >
                +
              </button>
            </div>
            <motion.button
              whileTap={isClosed ? undefined : { scale: 0.96 }}
              onClick={isClosed ? undefined : handleAddToCart}
              disabled={isClosed}
              className={`btn-primary flex-1 ${isClosed ? 'opacity-50 cursor-not-allowed bg-gray-400 hover:bg-gray-400' : ''}`}
            >
              {isClosed ? (
                <span>Store Closed 🔴</span>
              ) : (
                <>
                  <ShoppingBag size={18} />
                  Add to Cart — ₹{(multipliedSellingPrice * qty).toLocaleString()}
                </>
              )}
            </motion.button>
          </div>
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
