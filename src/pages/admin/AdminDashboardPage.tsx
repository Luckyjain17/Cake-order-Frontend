import { useState, useEffect, useRef } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DashboardStats } from '@/types'
import { ShoppingBag, IndianRupee, Calendar } from 'lucide-react'

function getLocalYMD(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminDashboardPage() {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(1) // First day of current month
    return getLocalYMD(d)
  })
  const [endDate, setEndDate] = useState<string>(() => getLocalYMD())
  const [weightFilter, setWeightFilter] = useState('')

  // General dashboard stats
  const { data: stats, isLoading: loadStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data),
    refetchInterval: 60000,
    staleTime: 0,              // always consider data stale
    refetchOnMount: 'always',  // always refetch when dashboard mounts
  })

  // Paginated list of manual orders for the selected date range
  const {
    data: dateOrdersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadOrders,
  } = useInfiniteQuery({
    queryKey: ['dateOrders', startDate, endDate, weightFilter],
    queryFn: ({ pageParam = 1 }) =>
      api.get('/orders/manual/all', {
        params: {
          page: pageParam,
          per_page: 10,
          start_date: startDate,
          end_date: endDate,
          weight: weightFilter || undefined,
        },
      }).then((r) => r.data),
    getNextPageParam: (last: any) => (last.page < last.pages ? last.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 0,              // always consider data stale
    refetchOnMount: 'always',  // always refetch when dashboard mounts
  })

  const dateOrders = dateOrdersData?.pages.flatMap((p) => p.items) ?? []
  // Sum of all quantities across loaded orders (not count of orders)
  const totalOrdersCount = dateOrders.reduce(
    (sum: number, order: any) => sum + (Number(order.quantity) || 1),
    0
  )

  // ✅ Revenue = sum of all currently loaded paid order amounts in the list
  const rangeRevenue = dateOrders.reduce(
    (sum: number, order: any) => sum + (order.payment_status === 'paid' ? (Number(order.amount) || 0) : 0),
    0
  )

  // Pending manual orders in range (payment_status is pending or half)
  const pendingOrdersCount = dateOrders.filter(
    (order: any) => order.payment_status === 'pending' || order.payment_status === 'half'
  ).length

  // Pending revenue: 100% of pending amount, 50% of half payment amount
  const pendingRevenue = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'pending') {
      return sum + (Number(order.amount) || 0)
    } else if (order.payment_status === 'half') {
      return sum + ((Number(order.amount) || 0) / 2)
    }
    return sum
  }, 0)

  // Parse weight string to kg helper
  const parseWeightToKg = (weightStr: string): number => {
    if (!weightStr) return 0
    const clean = weightStr.toLowerCase().trim()
    const match = clean.match(/^([\d.]+)\s*(kg|g)/)
    if (match) {
      const val = parseFloat(match[1])
      const unit = match[2]
      if (unit === 'kg') return val
      if (unit === 'g') return val / 1000
    }
    return 1 // Default to 1kg if unparseable
  }

  // Calculate total weight of placed orders
  const totalWeightKg = dateOrders.reduce((sum: number, order: any) => {
    const wt = parseWeightToKg(order.weight || '1kg')
    const qty = Number(order.quantity) || 1
    return sum + (wt * qty)
  }, 0)

  // Calculate pending weight of pending or half-payment orders
  const pendingWeightKg = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'pending' || order.payment_status === 'half') {
      const wt = parseWeightToKg(order.weight || '1kg')
      const qty = Number(order.quantity) || 1
      return sum + (wt * qty)
    }
    return sum
  }, 0)

  // Infinite scroll sentinel for orders list
  const ordersLoaderRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ordersLoaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (loadStats || loadOrders) {
    return (
      <div className="p-4 space-y-4">
        <div className="skeleton h-12 w-48 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
        </div>
        <div className="skeleton h-40 rounded-3xl" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-4 space-y-6 pb-8 max-w-md mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Welcome back, Admin!</p>
      </div>

      {/* Calendar Date Pickers — mobile-friendly */}
      <div className="card p-4 space-y-3 border border-gray-100 shadow-sm">
        <label className="label text-gray-500 font-bold flex items-center gap-1.5 text-xs">
          <Calendar size={14} /> Filter Date Range
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Start Date</span>
            <input
              type="date"
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">End Date</span>
            <input
              type="date"
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              value={endDate}
              min={startDate}
              max={getLocalYMD()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Filter by Weight</span>
          <select
            value={weightFilter}
            onChange={(e) => setWeightFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-600 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
          >
            <option value="">All Weights</option>
            <option value="500g">500g</option>
            <option value="1kg">1kg</option>
            <option value="1.5kg">1.5kg</option>
            <option value="2kg">2kg</option>
            <option value="2.5kg">2.5kg</option>
            <option value="3kg">3kg</option>
            <option value="3.5kg">3.5kg</option>
            <option value="4kg">4kg</option>
            <option value="4.5kg">4.5kg</option>
            <option value="5kg">5kg</option>
            <option value="6kg">6kg</option>
            <option value="7kg">7kg</option>
            <option value="8kg">8kg</option>
            <option value="9kg">9kg</option>
            <option value="10kg">10kg</option>
          </select>
        </div>
      </div>

      {/* Date Specific Stats Card */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total Orders Card */}
        <div className="card p-3 bg-gradient-to-br from-primary-500 to-pink-400 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div className="absolute -right-1 -bottom-1 text-4xl opacity-15 select-none pointer-events-none">
            <ShoppingBag size={40} />
          </div>
          <div>
            <p className="text-2xl font-extrabold">{totalOrdersCount}</p>
            <p className="text-[9px] font-semibold opacity-90">{totalWeightKg} kg total</p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-90">Orders</p>
        </div>

        {/* Total Revenue Card — sums loaded orders */}
        <div className="card p-3 bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div className="absolute -right-1 -bottom-1 text-4xl opacity-15 select-none pointer-events-none">
            <IndianRupee size={40} />
          </div>
          <p className="text-xl font-extrabold">₹{rangeRevenue.toLocaleString()}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-90">Revenue</p>
        </div>

        {/* Pending Orders Card */}
        <div className="card p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div>
            <p className="text-xl font-extrabold">₹{pendingRevenue.toLocaleString()}</p>
            <p className="text-[9px] font-semibold opacity-90 mt-0.5">{pendingOrdersCount} pending • {pendingWeightKg} kg</p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider opacity-90">Pending</p>
        </div>
      </div>

      {/* List of Orders on Selected Date Range */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Orders in Range</h2>
        {dateOrders.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <span className="text-3xl">📋</span>
            <p className="text-xs text-gray-400 mt-2 font-medium">No orders recorded in this range</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dateOrders.map((order: any) => (
              <div
                key={order.id}
                className="card p-3 border border-gray-100 shadow-sm flex items-center justify-between text-xs hover:border-pink-100 transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="font-bold text-gray-800 truncate">#{order.order_number}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">{order.customer_name} • {order.mobile_number}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{order.cake_name} ({order.quantity} qty)</p>
                </div>
                <span className="font-bold text-primary-500 flex-shrink-0">
                  ₹{Number(order.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Auto-scroll load more sentinel */}
        <div ref={ordersLoaderRef} className="h-6 flex items-center justify-center">
          {isFetchingNextPage && (
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Cakes Sold — only section shown */}
      {/* {stats.best_selling_products.length > 0 && (
        <div className="card p-4 border border-gray-100 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">🏆 Top Cakes Sold</h2>
          {stats.best_selling_products.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold flex items-center justify-center flex-shrink-0">#{i + 1}</span>
              <span className="flex-1 font-medium text-gray-700 truncate">{p.name}</span>
              <span className="font-bold text-primary-500 flex-shrink-0">{p.sold} sold</span>
            </div>
          ))}
        </div>
      )} */}
    </div>
  )
}
