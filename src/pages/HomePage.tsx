import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import api from '@/lib/api'
import type { PaginatedProducts, Category } from '@/types'
import ProductCarousel from '@/components/ProductCarousel'
import WhatsAppFab from '@/components/WhatsAppFab'

export default function HomePage() {
  const { data: featured, isLoading: loadFeatured } = useQuery<PaginatedProducts>({
    queryKey: ['featured'],
    queryFn: () => api.get('/products/featured').then((r) => r.data),
  })
  const { data: trending, isLoading: loadTrending } = useQuery<PaginatedProducts>({
    queryKey: ['trending'],
    queryFn: () => api.get('/products/trending').then((r) => r.data),
  })
  const { data: newArrivals, isLoading: loadNew } = useQuery<PaginatedProducts>({
    queryKey: ['newArrivals'],
    queryFn: () => api.get('/products/new-arrivals').then((r) => r.data),
  })
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then((r) => r.data),
  })

  return (
    <div className="pb-nav">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-white">
        <div className="page-container py-10 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-lg"
          >
            <p className="text-primary-500 font-semibold text-sm tracking-wide mb-2">🎂 100% Eggless</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Cakes that make <span className="text-gradient">moments</span> unforgettable
            </h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">
              Handcrafted with love. Perfect for every celebration — birthdays, weddings, anniversaries and more.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to="/shop" className="btn-primary">
                Order Now
              </Link>
              {/* <Link to="/shop?filter=best_seller" className="btn-secondary">
                Best Sellers
              </Link> */}
            </div>
          </motion.div>
          {/* Decorative floating cakes */}
          <div className="absolute right-0 top-0 w-1/2 h-full hidden md:flex items-center justify-center pointer-events-none select-none">
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[10rem] opacity-20"
            >
              🎂
            </motion.div>
          </div>
        </div>
      </section>

      {/* Search bar */}
      <div className="page-container -mt-5 relative z-10">
        <Link
          to="/search"
          className="flex items-center gap-3 bg-white rounded-2xl shadow-card px-4 py-3.5 border border-gray-100"
        >
          <Search size={18} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Search cakes, flavors, occasions…</span>
        </Link>
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="page-container mt-8 space-y-3">
          <h2 className="section-title">Categories</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.id}`}
                className="flex-shrink-0 flex flex-col items-center gap-1.5"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-100 flex items-center justify-center text-3xl shadow-soft border border-pink-100 hover:scale-105 transition-transform">
                  {cat.icon || '🎂'}
                </div>
                <span className="text-[11px] font-medium text-gray-600 text-center max-w-[64px] leading-tight">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Promo banner */}
      <div className="page-container mt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-gradient-to-r from-primary-500 to-pink-400 p-6 text-white relative overflow-hidden"
        >
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[80px] opacity-20 select-none pointer-events-none">🎉</div>
          <p className="text-sm font-semibold opacity-90">Limited Time</p>
          <h3 className="font-display text-2xl font-bold mt-1">Fresh & Eggless</h3>
          <p className="text-sm opacity-80 mt-1">Order before 6 PM for same-day delivery</p>
          <Link to="/shop" className="mt-4 inline-block bg-white text-primary-500 font-bold text-sm px-5 py-2 rounded-xl shadow hover:bg-pink-50 transition-colors">
            Shop Now →
          </Link>
        </motion.div>
      </div>

      {/* Carousels */}
      <div className="mt-10 space-y-10">
        {/* <ProductCarousel
          title="⭐ Best Sellers"
          viewAllLink="/shop?filter=best_seller"
          products={featured?.items || []}
          loading={loadFeatured}
        /> */}
        <ProductCarousel
          title="🔥 Trending Now"
          viewAllLink="/shop?filter=trending"
          products={trending?.items || []}
          loading={loadTrending}
        />
        <ProductCarousel
          title="✨ New Arrivals"
          viewAllLink="/shop?filter=new_arrival"
          products={newArrivals?.items || []}
          loading={loadNew}
        />
      </div>

      {/* Footer spacer */}
      <div className="h-10" />
      <WhatsAppFab />
    </div>
  )
}
