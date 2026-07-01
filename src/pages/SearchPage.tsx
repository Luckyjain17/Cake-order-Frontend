import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import api from '@/lib/api'
import type { PaginatedProducts } from '@/types'
import ProductCard from '@/components/ProductCard'
import { Search, X } from 'lucide-react'
import { motion } from 'framer-motion'

const POPULAR = ['Chocolate', 'Red Velvet', 'Black Forest', 'Birthday Cake', 'Wedding Cake']

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<PaginatedProducts>({
    queryKey: ['search', query],
    queryFn: () =>
      api.get('/products/', { params: { search: query, per_page: 20 } }).then((r) => r.data),
    enabled: query.length >= 2,
  })

  return (
    <div className="pb-nav">
      <div className="page-container py-4">
        {/* Search input */}
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cakes, flavors, occasions…"
            className="input pl-11 pr-10"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 text-gray-400">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Popular searches */}
        {!query && (
          <div className="mt-6">
            <p className="label text-gray-400 mb-3">Popular Searches</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((p) => (
                <button
                  key={p}
                  onClick={() => setQuery(p)}
                  className="px-4 py-2 rounded-full bg-gray-100 text-sm font-medium text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {query.length >= 2 && (
          <div className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton aspect-[3/4] rounded-3xl" />
                ))}
              </div>
            ) : data?.items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <span className="text-5xl">🔍</span>
                <p className="mt-4 text-gray-500 font-medium">No results for "{query}"</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
              </motion.div>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-3">{data?.total} result(s) for "{query}"</p>
                <div className="grid grid-cols-2 gap-4">
                  {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
