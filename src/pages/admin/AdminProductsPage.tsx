import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/lib/api'
import type { PaginatedProducts, ProductListItem } from '@/types'
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery<PaginatedProducts>({
    queryKey: ['adminProducts', search],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/products/admin/all', { params: { page: pageParam, per_page: 20, search: search || undefined } }).then((r) => r.data),
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 0,              // always consider data stale
    refetchOnMount: 'always',  // always refetch when this page mounts
  })

  const products = data?.pages.flatMap((p) => p.items) ?? []

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/products/${id}/toggle-availability`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminProducts'] }); toast.success('Updated!') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminProducts'] }); toast.success('Product deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = (product: ProductListItem) => {
    if (window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(product.id)
    }
  }

  return (
    <div className="p-4 pb-8 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">Products</h1>
        <Link to="/admin/products/new" className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Search products by name or flavor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Product list - Desktop Tabular Layout */}
      {products.length > 0 && (
        <div className="hidden md:block overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-lifted">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Flags</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {products.map((product) => {
                const imageUrl = product.cover_image?.thumbnail_url || product.cover_image?.url
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Image & Title */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {imageUrl ? (
                            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🎂</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{product.flavor || '—'}</p>
                        </div>
                      </div>
                    </td>
                    {/* Price */}
                    <td className="px-6 py-4 font-bold text-gray-900">
                      ₹{product.selling_price}
                    </td>
                    {/* Discount */}
                    <td className="px-6 py-4">
                      {product.discount_percent > 0 ? (
                        <span className="text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-lg text-xs">
                          {Math.round(product.discount_percent)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={`badge ${product.is_available ? 'badge-green' : 'badge-gray'} text-xs font-semibold`}>
                        {product.is_available ? 'Available' : 'Hidden'}
                      </span>
                    </td>
                    {/* Flags */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {product.is_best_seller ? (
                          <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">Best Seller</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/admin/products/edit/${product.id}`} className="btn-icon text-gray-500" title="Edit Product">
                          <Edit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(product)} className="btn-icon text-red-400" title="Delete Product">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Product list - Mobile Responsive Card Layout */}
      {products.length > 0 && (
        <div className="md:hidden space-y-3">
          {products.map((product) => {
            const imageUrl = product.cover_image?.thumbnail_url || product.cover_image?.url
            return (
              <div key={product.id} className="card p-3.5 flex gap-3.5 items-center border border-gray-100 shadow-sm bg-white">
                {/* Image */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">🎂</div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                    <span className="font-bold text-sm text-primary-500 flex-shrink-0">₹{product.selling_price}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{product.flavor || '—'}</p>

                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className={`badge ${product.is_available ? 'badge-green' : 'badge-gray'} text-[9px] font-bold px-2 py-0.5 rounded-lg`}>
                      {product.is_available ? 'Available' : 'Hidden'}
                    </span>
                    {product.is_best_seller && <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-lg text-[9px] font-bold">Best Seller</span>}
                    {product.discount_percent > 0 && (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg text-[9px] font-bold">
                        {Math.round(product.discount_percent)}%
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0 border-l border-gray-100 pl-2">
                  <Link to={`/admin/products/edit/${product.id}`} className="btn-icon text-gray-500 w-8 h-8" title="Edit">
                    <Edit size={14} />
                  </Link>
                  <button onClick={() => handleDelete(product)} className="btn-icon text-red-400 w-8 h-8" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="btn-secondary w-full py-3">
          Load More
        </button>
      )}

      {products.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-5xl">🎂</span>
          <p className="text-gray-400 mt-3">No products yet. Add your first cake!</p>
          <Link to="/admin/products/new" className="btn-primary mt-4 inline-flex items-center gap-1.5">
            <Plus size={16} /> Add Product
          </Link>
        </div>
      )}
    </div>
  )
}
