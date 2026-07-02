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
    if (isClosed) {
      toast.error('Store is closed. Ordering is disabled.')
      return
    }
    addItem({
      product_id: product.id,
      name: product.name,
      slug: product.slug,
      image_url: imageUrl,
      weight: '1kg',
      price: product.selling_price,
      qty: 1,
    })
    toast.success('Added to cart! 🎂', { duration: 1500 })
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
            <p className="text-xs text-gray-400 mt-0.5">
              {product.flavor}
              {product.flavor && product.price_base_weight && <span className="mx-1">•</span>}
              {product.price_base_weight}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-gray-900">₹{product.selling_price}</span>
              {product.original_price > product.selling_price && (
                <span className="text-xs text-gray-400 line-through ml-1.5">₹{product.original_price}</span>
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
