import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ProductListItem } from '@/types'
import { useCart } from '@/context/CartContext'
import toast from 'react-hot-toast'
import api, { getImageUrl } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

interface Props {
  product: ProductListItem
}

export default function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const imageUrl = getImageUrl(product.cover_image?.thumbnail_url || product.cover_image?.url)

  const flvs = product.flavor ? product.flavor.split(',').map((x: string) => x.trim()).filter(Boolean) : []
  const [selectedFlavor, setSelectedFlavor] = useState<string>(flvs[0] || '')

  const rates = (() => {
    try {
      return product.flavor_rates ? JSON.parse(product.flavor_rates) : {}
    } catch {
      return {}
    }
  })()

  const flavorRate = selectedFlavor ? rates[selectedFlavor] : null
  const sellingPrice = (flavorRate && flavorRate.selling_price !== undefined) ? flavorRate.selling_price : product.selling_price
  const originalPrice = product.discount_percent > 0
    ? sellingPrice / (1 - product.discount_percent / 100)
    : sellingPrice

  const { data: storeSetting } = useQuery({
    queryKey: ['settings', 'store_status'],
    queryFn: () => api.get('/settings/store_status').then((r) => r.data).catch(() => null),
  })

  const { data: reopenSetting } = useQuery({
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isClosed) {
      toast.error('Store is closed. Ordering is disabled.')
      return
    }
    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: imageUrl,
      weight: product.price_base_weight || '500g',
      price: sellingPrice,
      qty: 1,
      flavor: selectedFlavor || undefined,
    })
    toast.success('Added to cart! 🎂', { duration: 1500 })
  }

  const formatRupee = (v: number | string | undefined) => {
    const n = Number(v) || 0
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="card-hover group"
    >
      <Link to={`/product/${product.slug}`}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🎂</div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2">
            {product.is_best_seller && (
              <span className="badge-pink text-[10px] shadow-sm font-bold uppercase tracking-wide">Best Seller</span>
            )}
          </div>
          {product.discount_percent > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {Math.round(product.discount_percent)}% OFF
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
            {product.name}
          </p>
          {(product.flavor || product.price_base_weight) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1 min-h-[24px]">
              {flvs.length > 1 ? (
                <select
                  value={selectedFlavor}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onChange={(e) => setSelectedFlavor(e.target.value)}
                  className="appearance-none py-1 pl-2.5 pr-7 text-xs font-bold text-pink-600 bg-pink-50 hover:bg-pink-100/70 border border-pink-100 rounded-full cursor-pointer outline-none transition-all shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2523db2777%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.1rem_1.1rem] bg-[right_0.4rem_center] bg-no-repeat"
                >
                  {flvs.map((f) => (
                    <option key={f} value={f}>
                      🍰 {f}
                    </option>
                  ))}
                </select>
              ) : (
                product.flavor && (
                  <span className="text-xs text-gray-400 truncate">
                    {product.flavor}
                  </span>
                )
              )}
              {product.price_base_weight && (
                <span className="text-xs text-gray-400">
                  {flvs.length > 0 && <span className="mx-1">•</span>}
                  {product.price_base_weight}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-gray-900">₹{formatRupee(sellingPrice)}</span>
              {originalPrice > sellingPrice && (
                <span className="text-xs text-gray-400 line-through ml-1.5">₹{formatRupee(originalPrice)}</span>
              )}
            </div>
            <motion.button
              whileTap={isClosed ? undefined : { scale: 0.85 }}
              onClick={isClosed ? (e) => { e.preventDefault(); e.stopPropagation(); toast.error('Store is closed. Ordering is disabled.'); } : handleAddToCart}
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-soft transition-colors ${isClosed ? 'bg-gray-300 text-gray-400 cursor-not-allowed' : 'bg-primary-500 text-white'}`}
              disabled={isClosed}
            >
              <ShoppingBag size={14} />
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
