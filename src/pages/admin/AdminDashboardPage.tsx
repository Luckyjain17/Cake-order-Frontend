import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts'
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

  // Fetch manual orders for the selected date range and weight
  const { data: dateOrdersData, isLoading: loadOrders } = useQuery({
    queryKey: ['dateOrders', startDate, endDate, weightFilter],
    queryFn: () =>
      api.get('/orders/manual/all', {
        params: {
          page: 1,
          per_page: 1000,
          start_date: startDate,
          end_date: endDate,
          weight: weightFilter || undefined,
        },
      }).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const dateOrders = dateOrdersData?.items ?? []
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

  // Paid-only count and weight
  const paidCountOnly = dateOrders.filter((order: any) => order.payment_status === 'paid').length

  // Pending-only count and weight
  const pendingCountOnly = dateOrders.filter((order: any) => order.payment_status === 'pending').length

  // Half-paid count and weight
  const halfCountOnly = dateOrders.filter((order: any) => order.payment_status === 'half').length

  // Pending-only revenue: 100% of amount where status is pending
  const pendingOnlyRevenue = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'pending') {
      return sum + (Number(order.amount) || 0)
    }
    return sum
  }, 0)

  // Half-paid revenue: 50% of amount where status is half
  const halfPaidRevenue = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'half') {
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

  // Pending-only weight calculation
  const pendingWeightOnly = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'pending') {
      const wt = parseWeightToKg(order.weight || '1kg')
      const qty = Number(order.quantity) || 1
      return sum + (wt * qty)
    }
    return sum
  }, 0)

  // Half-paid weight calculation
  const halfWeightOnly = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'half') {
      const wt = parseWeightToKg(order.weight || '1kg')
      const qty = Number(order.quantity) || 1
      return sum + (wt * qty)
    }
    return sum
  }, 0)

  // Paid-only weight calculation
  const paidWeightOnly = dateOrders.reduce((sum: number, order: any) => {
    if (order.payment_status === 'paid') {
      const wt = parseWeightToKg(order.weight || '1kg')
      const qty = Number(order.quantity) || 1
      return sum + (wt * qty)
    }
    return sum
  }, 0)

  // State for toggling legend lines
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    Paid: true,
    Pending: true,
    "Half Paid": true,
  })

  // Date range generation helper (local timezone safe)
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    const dates: string[] = []
    const [sy, sm, sd] = startStr.split('-').map(Number)
    const [ey, em, ed] = endStr.split('-').map(Number)
    const start = new Date(sy, sm - 1, sd)
    const end = new Date(ey, em - 1, ed)
    const temp = new Date(start)
    while (temp <= end) {
      const year = temp.getFullYear()
      const month = String(temp.getMonth() + 1).padStart(2, '0')
      const day = String(temp.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
      temp.setDate(temp.getDate() + 1)
    }
    return dates
  }

  // Aggregated data for Recharts multi-line chart
  const chartData = getDatesInRange(startDate, endDate).map((d) => {
    const ordersOnDate = dateOrders.filter(
      (order: any) => order.delivery_date === d || (order.created_at && order.created_at.startsWith(d))
    )

    const paid = ordersOnDate.reduce(
      (sum: number, order: any) => sum + (order.payment_status === 'paid' ? (Number(order.amount) || 0) : 0),
      0
    )

    const pending = ordersOnDate.reduce(
      (sum: number, order: any) => sum + (order.payment_status === 'pending' ? (Number(order.amount) || 0) : 0),
      0
    )

    const half = ordersOnDate.reduce(
      (sum: number, order: any) => sum + (order.payment_status === 'half' ? ((Number(order.amount) || 0) / 2) : 0),
      0
    )

    const parts = d.split('-')
    const formattedDate = `${parts[2]}/${parts[1]}` // DD/MM format

    return {
      date: formattedDate,
      Paid: paid,
      Pending: pending,
      "Half Paid": half,
    }
  })

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
      <div className="grid grid-cols-2 gap-3">
        {/* Total Orders Card */}
        <div className="card p-3.5 bg-gradient-to-br from-primary-500 to-pink-400 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div className="absolute -right-1 -bottom-1 text-4xl opacity-15 select-none pointer-events-none">
            <ShoppingBag size={40} />
          </div>
          <div>
            <p className="text-2xl font-extrabold">{totalOrdersCount}</p>
            <p className="text-[10px] font-semibold opacity-90">{totalWeightKg} kg total</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Orders</p>
        </div>

        {/* Total Revenue Card — sums loaded orders */}
        <div className="card p-3.5 bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div className="absolute -right-1 -bottom-1 text-4xl opacity-15 select-none pointer-events-none">
            <IndianRupee size={40} />
          </div>
          <div>
            <p className="text-2xl font-extrabold">₹{rangeRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-semibold opacity-90">{paidCountOnly} paid • {paidWeightOnly} kg</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Revenue</p>
        </div>

        {/* Pending Orders Card */}
        <div className="card p-3.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div>
            <p className="text-2xl font-extrabold">₹{pendingOnlyRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-semibold opacity-90">{pendingCountOnly} pending • {pendingWeightOnly} kg</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Pending</p>
        </div>

        {/* Half Paid Orders Card */}
        <div className="card p-3.5 bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div>
            <p className="text-2xl font-extrabold">₹{halfPaidRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-semibold opacity-90">{halfCountOnly} half paid • {halfWeightOnly} kg</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Half Paid</p>
        </div>
      </div>

      {/* Multi-Line Revenue Chart Card */}
      <div className="card p-4 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">📈 Revenue Trends</h2>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg font-bold">Daily</span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
              />
              <Line
                type="monotone"
                dataKey="Paid"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6 }}
                hide={!visibleLines.Paid}
              >
                <LabelList dataKey="Paid" position="top" offset={8} style={{ fontSize: 9, fontWeight: 700, fill: '#059669' }} formatter={(v: number) => v > 0 ? `₹${v}` : ''} />
              </Line>
              <Line
                type="monotone"
                dataKey="Pending"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6 }}
                hide={!visibleLines.Pending}
              >
                <LabelList dataKey="Pending" position="top" offset={8} style={{ fontSize: 9, fontWeight: 700, fill: '#d97706' }} formatter={(v: number) => v > 0 ? `₹${v}` : ''} />
              </Line>
              <Line
                type="monotone"
                dataKey="Half Paid"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6 }}
                hide={!visibleLines["Half Paid"]}
              >
                <LabelList dataKey="Half Paid" position="top" offset={8} style={{ fontSize: 9, fontWeight: 700, fill: '#2563eb' }} formatter={(v: number) => v > 0 ? `₹${v}` : ''} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, Paid: !prev.Paid }))}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              visibleLines.Paid ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${visibleLines.Paid ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            Paid
          </button>
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, Pending: !prev.Pending }))}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              visibleLines.Pending ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${visibleLines.Pending ? 'bg-amber-500' : 'bg-gray-300'}`} />
            Pending
          </button>
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, "Half Paid": !prev["Half Paid"] }))}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              visibleLines["Half Paid"] ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${visibleLines["Half Paid"] ? 'bg-blue-500' : 'bg-gray-300'}`} />
            Half Paid
          </button>
        </div>
      </div>

      {/* List of Orders on Selected Date Range */}


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
