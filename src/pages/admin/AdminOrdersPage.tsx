import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2, Phone } from 'lucide-react'
import api from '@/lib/api'
import type { ManualOrder } from '@/types'
import toast from 'react-hot-toast'

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const qc = useQueryClient()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['manualOrders', search],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/orders/manual/all', {
        params: {
          page: pageParam,
          per_page: 20,
          search: search || undefined,
        },
      }).then((r) => r.data),
    getNextPageParam: (last: any) => (last.page < last.pages ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 0,                // always consider data stale
    refetchOnMount: 'always',    // always refetch when this page mounts
  })

  const orders: ManualOrder[] = data?.pages.flatMap((p: any) => p.items) ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/orders/manual/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manualOrders'] })
      toast.success('Order deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete order')
    },
  })

  const handleDelete = (id: number, orderNum: string) => {
    if (window.confirm(`Are you sure you want to delete order #${orderNum}?`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="p-4 pb-8 space-y-4 max-w-md mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">Orders</h1>
        <Link to="/admin/orders/new" className="btn-primary flex items-center gap-1">
          <Plus size={16} /> New Order
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Search by name, phone, or cake…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {isLoading ? (
          // Skeleton while loading
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-3xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl">📋</span>
            <p className="text-gray-400 mt-3">
              {search ? 'No orders match your search' : 'No orders yet. Tap + New Order to add one.'}
            </p>
          </div>
        ) : (
          orders.map((order) => (
          <div key={order.id} className="card p-4 space-y-3 border border-gray-100 shadow-sm">
            {/* Header: Order Number */}
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-gray-900">#{order.order_number}</span>
            </div>

            {/* Customer Details */}
            <div className="text-sm border-b border-gray-50 pb-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800">{order.customer_name}</p>
                <a
                  href={`tel:${order.mobile_number}`}
                  className="flex items-center gap-1 text-xs text-primary-500 font-bold bg-primary-50 px-2.5 py-1 rounded-xl"
                >
                  <Phone size={11} /> Call
                </a>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">{order.mobile_number}</p>
              {order.address && (
                <p className="text-gray-500 text-xs mt-1 bg-gray-50 p-2 rounded-xl border border-gray-100">{order.address}</p>
              )}
            </div>

            {/* Product Details */}
            <div className="flex justify-between items-baseline text-sm bg-pink-50/20 p-2.5 rounded-2xl">
              <span className="text-gray-700 font-medium">{order.cake_name} <span className="text-xs text-gray-400 font-normal">× {order.quantity}</span></span>
              <span className="font-bold text-primary-600">₹{order.amount.toLocaleString()}</span>
            </div>

            {/* Meta Details: Source, Date */}
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg capitalize">{order.order_source}</span>
              {order.delivery_date && <span>📅 {order.delivery_date}</span>}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              {/* Delete Button */}
              <button
                onClick={() => handleDelete(order.id, order.order_number)}
                className="w-full py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center gap-1.5 transition-colors text-xs font-bold"
                title="Delete Order"
              >
                <Trash2 size={14} /> Delete Order
              </button>
            </div>

            {order.notes && (
              <p className="text-xs text-gray-500 bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2">
                📝 {order.notes}
              </p>
            )}
          </div>
          ))
        )}
      </div>

      {/* Pagination Load More */}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="btn-secondary w-full py-3"
        >
          {isFetchingNextPage ? 'Loading more…' : 'Load More'}
        </button>
      )}
    </div>
  )
}
