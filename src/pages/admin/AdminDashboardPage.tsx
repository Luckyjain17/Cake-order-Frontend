import { useState, useRef, useEffect } from 'react'
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
    d.setDate(1)
    return getLocalYMD(d)
  })
  const [endDate, setEndDate] = useState<string>(() => getLocalYMD())

  const { data: stats, isLoading: loadStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then((r) => r.data),
    refetchInterval: 60000,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: dateOrdersData, isLoading: loadOrders } = useQuery({
    queryKey: ['dateOrders', startDate, endDate],
    queryFn: () =>
      api.get('/orders/manual/all', {
        params: {
          start_date: startDate,
          end_date: endDate,
          all: true,
        },
      }).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const dateOrders = dateOrdersData?.items ?? []

  // Helpers for safe legacy paid_amount fallback
  const getPaidAmount = (order: any): number => {
    if (order.payment_status === 'paid') {
      return order.paid_amount !== null && order.paid_amount !== undefined && Number(order.paid_amount) > 0
        ? Number(order.paid_amount)
        : Number(order.amount) || 0
    }
    if (order.payment_status === 'half') {
      return order.paid_amount !== null && order.paid_amount !== undefined && Number(order.paid_amount) > 0
        ? Number(order.paid_amount)
        : (Number(order.amount) || 0) / 2
    }
    return Number(order.paid_amount) || 0
  }

  const getPendingAmount = (order: any): number => {
    const total = Number(order.amount) || 0
    const paid = getPaidAmount(order)
    if (order.payment_status === 'pending' || order.payment_status === 'half') {
      return Math.max(0, total - paid)
    }
    return 0
  }

  // Aggregate stats
  const totalOrdersCount = dateOrders.reduce(
    (sum: number, order: any) => sum + (Number(order.quantity) || 1), 0
  )
  const rangeRevenue = dateOrders.reduce(
    (sum: number, order: any) => sum + getPaidAmount(order), 0
  )
  const totalPendingRevenue = dateOrders.reduce(
    (sum: number, order: any) => sum + getPendingAmount(order), 0
  )
  const paidCountOnly = dateOrders.filter((o: any) => o.payment_status === 'paid').length
  const pendingCountOnly = dateOrders.filter((o: any) => o.payment_status === 'pending').length
  const halfCountOnly = dateOrders.filter((o: any) => o.payment_status === 'half').length

  // Weight helpers
  const parseWeightToKg = (w: string): number => {
    if (!w) return 1
    const m = w.toLowerCase().trim().match(/^([\d.]+)\s*(kg|g)/)
    if (m) {
      const val = parseFloat(m[1])
      return m[2] === 'kg' ? val : val / 1000
    }
    return 1
  }

  const totalWeightKg = dateOrders.reduce((sum: number, o: any) => {
    return sum + parseWeightToKg(o.weight || '1kg') * (Number(o.quantity) || 1)
  }, 0)
  const paidWeightOnly = dateOrders.reduce((sum: number, o: any) => {
    if (o.payment_status === 'paid') return sum + parseWeightToKg(o.weight || '1kg') * (Number(o.quantity) || 1)
    return sum
  }, 0)
  const pendingWeightOnly = dateOrders.reduce((sum: number, o: any) => {
    if (o.payment_status === 'pending') return sum + parseWeightToKg(o.weight || '1kg') * (Number(o.quantity) || 1)
    return sum
  }, 0)
  const halfWeightOnly = dateOrders.reduce((sum: number, o: any) => {
    if (o.payment_status === 'half') return sum + parseWeightToKg(o.weight || '1kg') * (Number(o.quantity) || 1)
    return sum
  }, 0)

  // Chart state
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({ Paid: true, Pending: true })
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToLatest = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: 'smooth' })
    }
  }

  // Date range helper
  const getDatesInRange = (startStr: string, endStr: string): string[] => {
    const dates: string[] = []
    const [sy, sm, sd] = startStr.split('-').map(Number)
    const [ey, em, ed] = endStr.split('-').map(Number)
    const temp = new Date(sy, sm - 1, sd)
    const end = new Date(ey, em - 1, ed)
    while (temp <= end) {
      dates.push(`${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`)
      temp.setDate(temp.getDate() + 1)
    }
    return dates
  }

  const getOrderDate = (order: any): string => {
    if (order.delivery_date && order.delivery_date.trim() !== '') {
      return order.delivery_date
    }
    if (order.created_at) {
      return order.created_at.substring(0, 10)
    }
    return ''
  }

  // Chart data per day
  const chartData = getDatesInRange(startDate, endDate).map((d) => {
    const ordersOnDate = dateOrders.filter(
      (o: any) => getOrderDate(o) === d
    )
    const paid = ordersOnDate.reduce((s: number, o: any) => s + getPaidAmount(o), 0)
    const pending = ordersOnDate.reduce((s: number, o: any) => s + getPendingAmount(o), 0)
    const parts = d.split('-')
    return { date: `${parts[2]}/${parts[1]}`, Paid: paid, Pending: pending }
  })

  // Auto-scroll to latest
  useEffect(() => {
    const t = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
      }
    }, 100)
    return () => clearTimeout(t)
  }, [chartData.length])

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

      {/* Date Filter */}
      <div className="card p-4 space-y-3 border border-gray-100 shadow-sm">
        <label className="label text-gray-500 font-bold flex items-center gap-1.5 text-xs">
          <Calendar size={14} /> Filter Date Range
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Start Date</span>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="text-gray-300 self-end mb-2.5">—</span>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">End Date</span>
            <input
              type="date"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              value={endDate}
              min={startDate}
              max={getLocalYMD()}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Orders — full width */}
        <div className="col-span-2 card p-3.5 bg-gradient-to-br from-primary-500 to-pink-400 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div className="absolute -right-1 -bottom-1 opacity-15 select-none pointer-events-none">
            <ShoppingBag size={40} />
          </div>
          <div>
            <p className="text-2xl font-extrabold">{totalOrdersCount}</p>
            <p className="text-[10px] font-semibold opacity-90">{totalWeightKg.toFixed(1)} kg total</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Orders</p>
        </div>

        {/* Revenue */}
        <div className="card p-3.5 bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div className="absolute -right-1 -bottom-1 opacity-15 select-none pointer-events-none">
            <IndianRupee size={40} />
          </div>
          <div>
            <p className="text-2xl font-extrabold">₹{rangeRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-semibold opacity-90">{paidCountOnly} paid • {paidWeightOnly.toFixed(1)} kg</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Revenue</p>
        </div>

        {/* Pending */}
        <div className="card p-3.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft relative overflow-hidden flex flex-col justify-between min-h-[96px]">
          <div>
            <p className="text-2xl font-extrabold">₹{totalPendingRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-semibold opacity-90">
              {pendingCountOnly + halfCountOnly} pending • {(pendingWeightOnly + halfWeightOnly).toFixed(1)} kg
            </p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Pending</p>
        </div>
      </div>

      {/* Chart Card */}
      <div className="card p-4 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">📈 Revenue Trends</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={scrollToLatest}
              className="text-[9px] bg-primary-50 text-primary-600 border border-primary-100 px-2 py-0.5 rounded-lg font-bold hover:bg-primary-100 transition-colors"
            >
              Latest ➔
            </button>
            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg font-bold">Daily</span>
          </div>
        </div>

        {/* Sticky Y-axis + scrollable chart */}
        <div className="flex w-full" style={{ height: '240px' }}>
          {/* Fixed Y-axis */}
          <div style={{ width: '52px', flexShrink: 0, height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 0, left: 0, bottom: 5 }}>
                <YAxis
                  stroke="#9ca3af"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                  width={52}
                />
                <Line dataKey="Paid" stroke="transparent" dot={false} legendType="none" />
                <Line dataKey="Pending" stroke="transparent" dot={false} legendType="none" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Scrollable chart body */}
          <div className="flex-1 overflow-x-auto" ref={scrollContainerRef}>
            <div style={{ width: `${Math.max(300, chartData.length * 60)}px`, height: '240px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    }}
                  />
                  {visibleLines.Paid && (
                    <Line
                      type="monotone"
                      dataKey="Paid"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList
                        dataKey="Paid"
                        position="top"
                        offset={8}
                        style={{ fontSize: 9, fontWeight: 700, fill: '#059669' }}
                        formatter={(v: any) => (v && Number(v) > 0) ? `₹${v}` : ''}
                      />
                    </Line>
                  )}
                  {visibleLines.Pending && (
                    <Line
                      type="monotone"
                      dataKey="Pending"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList
                        dataKey="Pending"
                        position="top"
                        offset={8}
                        style={{ fontSize: 9, fontWeight: 700, fill: '#d97706' }}
                        formatter={(v: any) => (v && Number(v) > 0) ? `₹${v}` : ''}
                      />
                    </Line>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Legend toggle buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, Paid: !prev.Paid }))}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              visibleLines.Paid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
                : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${visibleLines.Paid ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            Paid
          </button>
          <button
            onClick={() => setVisibleLines(prev => ({ ...prev, Pending: !prev.Pending }))}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
              visibleLines.Pending
                ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm'
                : 'bg-gray-50 border-gray-100 text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${visibleLines.Pending ? 'bg-amber-500' : 'bg-gray-300'}`} />
            Pending
          </button>
        </div>
      </div>
    </div>
  )
}
