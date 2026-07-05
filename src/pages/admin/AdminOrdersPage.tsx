import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search, Trash2, Phone, Edit2, SlidersHorizontal, X, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import api from '@/lib/api'
import type { ManualOrder } from '@/types'
import toast from 'react-hot-toast'

export default function AdminOrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [weightFilter, setWeightFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [draftSource, setDraftSource] = useState('')
  const [draftPayment, setDraftPayment] = useState('')
  const [draftWeight, setDraftWeight] = useState('')
  const qc = useQueryClient()

  const openFilters = () => {
    setDraftSource(sourceFilter)
    setDraftPayment(paymentFilter)
    setDraftWeight(weightFilter)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setSourceFilter(draftSource)
    setPaymentFilter(draftPayment)
    setWeightFilter(draftWeight)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setDraftSource('')
    setDraftPayment('')
    setDraftWeight('')
    setSourceFilter('')
    setPaymentFilter('')
    setWeightFilter('')
    setShowFilters(false)
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['manualOrders', search, statusFilter, sourceFilter, paymentFilter, weightFilter],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/orders/manual/all', {
        params: {
          page: pageParam,
          per_page: 10,
          search: search || undefined,
          status: statusFilter || undefined,
          order_source: sourceFilter || undefined,
          payment_status: paymentFilter || undefined,
          weight: weightFilter || undefined,
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
    <div className="p-4 pb-8 space-y-4 max-w-xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">Orders</h1>
        <Link to="/admin/orders/new" className="btn-primary flex items-center gap-1.5">
          <Plus size={16} /> New Order
        </Link>
      </div>

      {/* Search Bar & Filter trigger */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search by name, phone, or cake…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={openFilters}
          className={`flex items-center justify-center gap-1.5 px-4 rounded-xl border h-[42px] text-xs font-bold transition-all flex-shrink-0 ${
            sourceFilter || paymentFilter || weightFilter
              ? 'bg-primary-50 border-primary-200 text-primary-600'
              : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal size={14} />
          Filters
          {(sourceFilter || paymentFilter || weightFilter) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
          )}
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          // Skeleton while loading
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-3xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-5xl">📋</span>
            <p className="text-gray-400 mt-3">
              {search ? 'No orders match your search' : 'No orders yet. Tap + New Order to add one.'}
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const paidAmt = order.paid_amount || 0
            const totalAmt = order.amount
            const balanceAmt = Math.max(0, totalAmt - paidAmt)
            const paidPercent = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0

            return (
              <div
                key={order.id}
                className="card p-5 space-y-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden bg-white rounded-3xl"
              >
                {/* Header: Order Number & Source */}
                <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                  <span className="bg-pink-50 text-primary-600 px-3 py-1 rounded-xl text-xs font-extrabold tracking-wide border border-pink-100/50">
                    #{order.order_number}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider capitalize">
                      {order.order_source === 'whatsapp' ? '💬' : order.order_source === 'phone' ? '📞' : order.order_source === 'walkin' ? '🚶' : order.order_source === 'instagram' ? '📸' : order.order_source === 'facebook' ? '📘' : '📌'} {order.order_source}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider border ${
                      order.payment_status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : order.payment_status === 'half'
                          ? 'bg-blue-50 text-blue-600 border-blue-100'
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {order.payment_status === 'half' ? 'Half Paid' : order.payment_status}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-gray-900 text-lg tracking-tight leading-tight">{order.customer_name}</p>
                      <p className="text-xs text-gray-400 font-bold mt-1 tracking-wider">{order.mobile_number}</p>
                    </div>
                    <a
                      href={`tel:${order.mobile_number}`}
                      className="flex items-center gap-1.5 text-xs text-white font-bold bg-primary-500 px-3.5 py-2 rounded-xl hover:bg-primary-600 active:scale-95 transition-all shadow-sm"
                    >
                      <Phone size={12} /> Call
                    </a>
                  </div>
                  {order.address && (
                    <div className="flex gap-2 items-start bg-gray-50/50 border border-gray-100 p-2.5 rounded-xl text-gray-500 mt-1">
                      <span className="text-xs mt-0.5">📍</span>
                      <p className="leading-relaxed font-medium">{order.address}</p>
                    </div>
                  )}
                </div>

                {/* Product Box */}
                <div className="flex justify-between items-center bg-gray-50/70 p-3.5 rounded-2xl border border-gray-100/50">
                  <div className="min-w-0 pr-3">
                    <p className="text-base font-extrabold text-gray-900 leading-snug">{order.cake_name}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-gray-500">
                      <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg">⚖️ {order.weight || '1kg'}</span>
                      <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-lg">📦 {order.quantity} Qty</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-black text-primary-600 tracking-tight font-sans">₹{totalAmt.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">₹{Math.round(totalAmt / (order.quantity || 1)).toLocaleString()}/unit</p>
                  </div>
                </div>

                {/* Half Paid Breakdown box */}
                {order.payment_status === 'half' && (
                  <div className="space-y-1.5 p-3.5 bg-blue-50/20 border border-blue-100/50 rounded-2xl text-[10px]">
                    <div className="flex justify-between font-bold text-blue-600">
                      <span>Paid: ₹{paidAmt.toLocaleString()}</span>
                      <span>Balance: ₹{balanceAmt.toLocaleString()}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${paidPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Notes box */}
                {order.notes && (
                  <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50/30 border border-amber-100/50 rounded-xl p-3 leading-relaxed">
                    <span className="text-xs flex-shrink-0">📝</span>
                    <p className="font-medium">{order.notes}</p>
                  </div>
                )}

                {/* Delivery Date */}
                {order.delivery_date && (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-bold border-t border-gray-100 pt-3">
                    <span>📅 Delivery Date:</span>
                    <span className="text-gray-800 font-extrabold">{order.delivery_date}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                  <Link
                    to={`/admin/orders/edit/${order.id}`}
                    className="py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center justify-center gap-1.5 transition-all text-xs font-bold border border-gray-100"
                  >
                    <Edit2 size={14} /> Edit Order
                  </Link>
                  <button
                    onClick={() => handleDelete(order.id, order.order_number)}
                    className="py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center gap-1.5 transition-all text-xs font-bold border border-red-100"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )
          })
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

      {/* Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowFilters(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="fixed bottom-0 inset-x-0 bg-white z-50 rounded-t-[2.5rem] p-6 pb-8 overflow-y-auto max-h-[85vh] shadow-lifted border-t border-gray-100 max-w-md mx-auto space-y-6"
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
              
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-gray-900">Filters</h3>
                <button onClick={() => setShowFilters(false)} className="btn-icon">
                  <X size={18} />
                </button>
              </div>

              {/* 1. Source Filter */}
              <div className="space-y-2.5">
                <p className="text-gray-700 text-xs font-bold uppercase tracking-wide">Order Source</p>
                <div className="flex flex-wrap gap-2">
                  {['whatsapp', 'phone', 'walkin', 'instagram', 'facebook', 'other'].map((src) => {
                    const active = draftSource === src
                    return (
                      <button
                        key={src}
                        onClick={() => setDraftSource(active ? '' : src)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all ${
                          active
                            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
                        }`}
                      >
                        {active && <Check size={10} />}
                        {src === 'whatsapp' ? '💬' : src === 'phone' ? '📞' : src === 'walkin' ? '🚶' : src === 'instagram' ? '📸' : src === 'facebook' ? '📘' : '📌'} {src}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Payment Filter */}
              <div className="space-y-2.5">
                <p className="text-gray-700 text-xs font-bold uppercase tracking-wide">Payment Status</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'pending', label: 'Pending' },
                    { val: 'paid', label: 'Paid' },
                    { val: 'half', label: 'Half Paid' }
                  ].map((p) => {
                    const active = draftPayment === p.val
                    return (
                      <button
                        key={p.val}
                        onClick={() => setDraftPayment(active ? '' : p.val)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
                        }`}
                      >
                        {active && <Check size={10} />}
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Weight Filter */}
              <div className="space-y-2.5">
                <p className="text-gray-700 text-xs font-bold uppercase tracking-wide">Cake Weight</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 border border-gray-100 rounded-2xl bg-gray-50/30">
                  {['500g', '1kg', '1.5kg', '2kg', '2.5kg', '3kg', '3.5kg', '4kg', '4.5kg', '5kg', '6kg', '7kg', '8kg', '9kg', '10kg'].map((w) => {
                    const active = draftWeight === w
                    return (
                      <button
                        key={w}
                        onClick={() => setDraftWeight(active ? '' : w)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        {active && <Check size={10} />}
                        {w}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={clearFilters}
                  className="btn-secondary flex-1 py-3 rounded-2xl text-xs font-bold"
                >
                  Clear All
                </button>
                <button
                  onClick={applyFilters}
                  className="btn-primary flex-1 py-3 rounded-2xl text-xs font-bold"
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
