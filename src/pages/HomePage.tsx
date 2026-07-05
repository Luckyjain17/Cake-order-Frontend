import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import api from '@/lib/api'
import type { PaginatedProducts, Category } from '@/types'
import ProductCarousel from '@/components/ProductCarousel'
import WhatsAppFab from '@/components/WhatsAppFab'

import {
  Cake,
  Heart,
  Sparkles,
  Smile,
  Cookie,
  Palette,
  PartyPopper,
  Camera,
  Gift,
  Phone,
} from 'lucide-react'

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  'birthday-cake': Cake,
  'anniversary-cake': Heart,
  'wedding-cake': Sparkles,
  'kids-cake': Smile,
  'cup-cake': Cookie,
  'pastry': Gift,
  'theme-cake': Palette,
  'festival-cake': PartyPopper,
  'photo-cake': Camera,
}

function getCategoryIcon(name: string) {
  const slug = name.toLowerCase().trim().replace(/[\s_-]+/g, '-')
  return CATEGORY_ICON_MAP[slug] || Cake
}

export default function HomePage() {
  const { data: featured, isLoading: loadFeatured } = useQuery<PaginatedProducts>({
    queryKey: ['featured'],
    queryFn: () => api.get('/products/featured').then((r) => r.data),
  })
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then((r) => r.data),
  })

  const [helpHighlighted, setHelpHighlighted] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (location.hash === '#contact-support') {
      const helpSection = document.getElementById('contact-support')
      if (!helpSection) return

      const scrollToHelp = () => {
        helpSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setHelpHighlighted(true)
        window.setTimeout(() => setHelpHighlighted(false), 1600)
      }

      window.setTimeout(scrollToHelp, 120)
    }
  }, [location.hash])

  return (
    <div className="pb-nav">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-rose-50 to-white border-b border-pink-50/50">
        <div className="page-container py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-lg text-center md:text-left flex flex-col items-center md:items-start"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold uppercase tracking-wide mb-4 shadow-sm select-none">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              100% Eggless
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Cakes that make <span className="text-gradient">moments</span> unforgettable
            </h1>
            <p className="mt-4 text-gray-500 text-base leading-relaxed">
              Homemade with love. Perfect for every celebration — birthdays, weddings, anniversaries and more.
            </p>
            <div className="mt-6">
              <Link to="/shop" className="btn-primary px-8 py-3.5 text-base font-bold shadow-md shadow-primary-200/50 hover:-translate-y-0.5 transition-all">
                Order Now
              </Link>
            </div>
          </motion.div>

          {/* Large floating Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -10, 0]
            }}
            transition={{
              opacity: { duration: 0.6, delay: 0.2 },
              scale: { duration: 0.6, delay: 0.2 },
              y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            }}
            className="flex-shrink-0 w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 rounded-full overflow-hidden border-4 border-white shadow-xl shadow-pink-100/50 relative bg-white select-none"
          >
            <img
              src="/logo.jpg"
              alt="Homemade Mapas Cake"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 rounded-full border border-pink-100/30 pointer-events-none" />
          </motion.div>
        </div>
      </section>



      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="page-container mt-8 space-y-4">
          <h2 className="section-title text-gray-950 font-display text-lg font-bold">Categories</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
            {categories.map((cat) => {
              const IconComponent = getCategoryIcon(cat.name)
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.id}`}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 rounded-full bg-white border border-pink-100/60 flex items-center justify-center text-primary-500 shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:border-primary-300 group-hover:bg-pink-50/20">
                    <IconComponent size={24} className="transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-xs font-bold text-gray-700 text-center max-w-[72px] leading-tight group-hover:text-primary-500 transition-colors">
                    {cat.name}
                  </span>
                </Link>
              )
            })}
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
          <p className="text-sm opacity-80 mt-1">Order before 9 PM for same-day delivery</p>
          <Link to="/shop" className="mt-4 inline-block bg-white text-primary-500 font-bold text-sm px-5 py-2 rounded-xl shadow hover:bg-pink-50 transition-colors">
            Shop Now →
          </Link>
        </motion.div>
      </div>

      {/* Help / Contact */}
      <section id="contact-support" className="page-container mt-10 mb-4 scroll-mt-24">
        <motion.div
          animate={helpHighlighted ? {
            boxShadow: ['0 0 0 0px rgba(236,72,153,0)', '0 0 0 6px rgba(236,72,153,0.35)', '0 0 0 12px rgba(236,72,153,0.15)', '0 0 0 0px rgba(236,72,153,0)'],
            scale: [1, 1.015, 1.005, 1],
          } : { boxShadow: '0 0 0 0px rgba(236,72,153,0)', scale: 1 }}
          transition={{ duration: 1.2, times: [0, 0.3, 0.7, 1] }}
          className="card p-5 sm:p-6 bg-gradient-to-br from-pink-50/60 via-white to-rose-50/20 border border-pink-100/50 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between rounded-2xl"
        >
          <div className="text-center sm:text-left">
            <h3 className="text-sm font-bold text-gray-900">Need Help or Custom Orders?</h3>
            <p className="text-xs text-gray-400 mt-1">Reach out to us directly via Call or Instagram</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <a
              href="tel:+918269412418"
              className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm active:scale-95 transition-all"
            >
              <Phone size={14} className="text-primary-500" />
              Call Support
            </a>
            <a
              href="https://www.instagram.com/homemade_mapas_cakes?igsh=b28xZTN2NTVucjF0"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm active:scale-95 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-pink-500"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Instagram
            </a>
          </div>
        </motion.div>
      </section>

      {/* Carousels */}
      <div className="mt-10 space-y-10">
        {/* <ProductCarousel
          title="Best Sellers"
          viewAllLink="/shop?filter=best_seller"
          products={featured?.items || []}
          loading={loadFeatured}
        /> */}
      </div>

      {/* Footer spacer */}
      <div className="h-10" />
      <WhatsAppFab />
    </div>
  )
}
