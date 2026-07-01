import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, Check } from 'lucide-react'
import api from '@/lib/api'
import type { PaginatedProducts, Category } from '@/types'
import ProductCard from '@/components/ProductCard'
import { motion, AnimatePresence } from 'framer-motion'

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const categoryId = searchParams.get('category')
  const filter = searchParams.get('filter')
  const flavor = searchParams.get('flavor')
  const cakeType = searchParams.get('cake_type')

  const [draftFlavor, setDraftFlavor] = useState<string | null>(null)

  const openDrawer = () => {
    setDraftFlavor(flavor)
    setShowFilters(true)
  }

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories/').then((r) => r.data),
  })

  const { data: filtersData } = useQuery<{ flavors: string[]; cake_types: string[] }>({
    queryKey: ['filtersList'],
    queryFn: () => api.get('/products/filters-list').then((r) => r.data),
  })

  const dynamicFlavors = filtersData?.flavors ?? []

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery<PaginatedProducts>({
      queryKey: ['shopProducts', categoryId, filter, flavor, cakeType],
      queryFn: ({ pageParam = 1 }) => {
        const params: Record<string, string> = { page: String(pageParam), per_page: '20' }
        if (categoryId) params.category_id = categoryId
        if (filter === 'best_seller') params.is_best_seller = 'true'
        if (filter === 'trending') params.is_trending = 'true'
        if (filter === 'new_arrival') params.is_new_arrival = 'true'
        if (flavor) params.flavor = flavor
        if (cakeType) params.cake_type = cakeType
        return api.get('/products/', { params }).then((r) => r.data)
      },
      getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
      initialPageParam: 1,
    })

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { threshold: 0.1 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const products = data?.pages.flatMap((p) => p.items) ?? []

  const setChipFilter = (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) p.set(key, value)
      else p.delete(key)
    }
    setSearchParams(p)
  }

  const applyDrawerFilters = () => {
    const p = new URLSearchParams(searchParams)
    if (draftFlavor) p.set('flavor', draftFlavor)
    else p.delete('flavor')
    p.delete('cake_type')
    setSearchParams(p)
    setShowFilters(false)
  }

  const activeDrawerCount = flavor ? 1 : 0
  const isAllCakes = !filter && !categoryId && !flavor

  return (
    <div className="pb-nav">
      {/* Sticky Header */}
      <div className="sticky top-16 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="relative flex items-center justify-between page-container py-1.5 min-w-0 overflow-hidden">
          {/* Scrollable chips */}
          <div className="flex-1 overflow-x-auto hide-scrollbar flex items-center gap-2 px-4 py-1 select-none touch-pan-x min-w-0">
            <button
              onClick={() => setSearchParams({})}
              className={`flex-shrink-0 px-4 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                isAllCakes ? 'bg-primary-500 text-white shadow-soft' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Cakes
            </button>
            <button
              onClick={() =>
                setChipFilter({ filter: filter === 'trending' ? null : 'trending', category: null, flavor: null, cake_type: null })
              }
              className={`flex-shrink-0 px-4 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                filter === 'trending' ? 'bg-primary-500 text-white shadow-soft' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              🔥 Trending
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setChipFilter({
                    category: categoryId === String(cat.id) ? null : String(cat.id),
                    filter: null,
                    flavor: null,
                    cake_type: null,
                  })
                }
                className={`flex-shrink-0 px-4 py-1.5 rounded-2xl text-xs font-bold transition-all ${
                  categoryId === String(cat.id) ? 'bg-primary-500 text-white shadow-soft' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
            <div className="w-24 flex-shrink-0" />
          </div>

          {/* Filter button with active badge */}
          <div className="absolute right-0 top-0 bottom-0 flex items-center pl-8 bg-gradient-to-l from-white via-white/95 to-transparent pr-4 pointer-events-none">
            <button
              onClick={openDrawer}
              className="pointer-events-auto relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-gray-700 font-bold text-xs shadow-card border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <SlidersHorizontal size={12} className="text-primary-500" /> Filters
              {activeDrawerCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeDrawerCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {flavor && (
        <div className="page-container flex flex-wrap gap-2 pt-3 pb-1">
          <button
            onClick={() => setChipFilter({ flavor: null })}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold"
          >
            {flavor} <X size={10} />
          </button>
        </div>
      )}

      {/* Product Grid */}
      <div className="page-container py-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-3xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-6xl">🎂</span>
            <p className="text-gray-400 font-medium">No cakes found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <div ref={loaderRef} className="h-10 flex items-center justify-center mt-4">
          {isFetchingNextPage && (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  className="w-2 h-2 bg-primary-400 rounded-full"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="fixed bottom-0 inset-x-0 bg-white z-50 rounded-t-[2.5rem] p-6 pb-8 overflow-y-auto max-h-[80vh] shadow-lifted border-t border-gray-100 max-w-md mx-auto"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-lg font-bold text-gray-900">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>

              {/* Flavors — only if backend has data */}
              {dynamicFlavors.length > 0 && (
                <div className="mb-6">
                  <p className="text-gray-700 text-xs font-bold mb-3 uppercase tracking-wide">Flavors</p>
                  <div className="flex flex-wrap gap-2">
                    {dynamicFlavors.map((f) => {
                      const active = draftFlavor === f
                      return (
                        <button
                          key={f}
                          onClick={() => setDraftFlavor(active ? null : f)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            active
                              ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
                          }`}
                        >
                          {active && <Check size={10} />}
                          {f}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* No filters yet */}
              {dynamicFlavors.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <p>No flavor filters available yet.</p>
                  <p className="text-xs mt-1">Add flavors to your products first.</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setDraftFlavor(null)}
                  className="btn-secondary flex-1 py-3.5 rounded-2xl text-sm"
                >
                  Clear
                </button>
                <button
                  onClick={applyDrawerFilters}
                  className="btn-primary flex-1 py-3.5 rounded-2xl text-sm"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
