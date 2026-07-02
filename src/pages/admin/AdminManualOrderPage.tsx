import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const SOURCES = ['whatsapp', 'phone', 'walkin', 'instagram', 'facebook', 'other']

const blank = {
  customer_name: '', mobile_number: '', address: '',
  cake_name: '', quantity: '1', weight: '1kg', amount: '',
  _unit_price: '',
  order_source: 'whatsapp', payment_status: 'pending',
  paid_amount: '0',
  status: 'new', notes: '', delivery_date: '',
}

export default function AdminManualOrderPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [form, setForm] = useState<any>(blank)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (isEdit) {
      api.get(`/orders/manual/${id}`)
        .then((r) => {
          const o = r.data
          const unitPrice = o.quantity > 0 ? Math.round(o.amount / o.quantity) : o.amount
          setForm({
            ...o,
            _unit_price: String(unitPrice),
            quantity: String(o.quantity),
            amount: String(o.amount),
            paid_amount: String(o.paid_amount || 0),
          })
        })
        .catch(() => {
          toast.error('Failed to load order details')
          navigate('/admin/orders')
        })
    }
  }, [id, isEdit, navigate])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f: any) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _unit_price, id: _, order_number: __, created_at: ___, updated_at: ____, ...payload } = form
      const qty = parseInt(form.quantity) || 1
      const amt = Math.round(parseFloat(form.amount) || 0)
      let paidAmt = Math.round(parseFloat(form.paid_amount) || 0)

      if (form.payment_status === 'paid') {
        paidAmt = amt
      } else if (form.payment_status === 'pending') {
        paidAmt = 0
      }

      if (isEdit) {
        await api.put(`/orders/manual/${id}`, {
          ...payload,
          quantity: qty,
          amount: amt,
          paid_amount: paidAmt,
        })
        toast.success('Manual order updated!')
      } else {
        await api.post('/orders/manual', {
          ...payload,
          quantity: qty,
          amount: amt,
          paid_amount: paidAmt,
        })
        toast.success('Manual order created!')
      }
      navigate('/admin/orders')
    } catch {
      toast.error(isEdit ? 'Failed to update order' : 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 pb-8 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Manual Order' : 'Manual Order'}
        </h1>
        <button onClick={() => navigate('/admin/orders')} className="btn-ghost">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-700">Order Source</h2>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f: any) => ({ ...f, order_source: s }))}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                  form.order_source === s ? 'border-primary-500 bg-primary-50 text-primary-500' : 'border-gray-200 text-gray-600'
                }`}
              >
                {s === 'whatsapp' ? '💬' : s === 'phone' ? '📞' : s === 'walkin' ? '🚶' : s === 'instagram' ? '📸' : s === 'facebook' ? '📘' : '📌'} {s}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-700">Customer Info</h2>
          <div>
            <label className="label">Customer Name *</label>
            <input className="input" value={form.customer_name} onChange={set('customer_name')} required />
          </div>
          <div>
            <label className="label">Mobile Number *</label>
            <input className="input" type="tel" value={form.mobile_number} onChange={set('mobile_number')} required />
          </div>
        </div>

        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-700">Order Details</h2>
          <div>
            <label className="label">Cake Name *</label>
            <input className="input" value={form.cake_name} onChange={set('cake_name')} placeholder="e.g. Chocolate Birthday Cake" required />
          </div>

          <div>
            <label className="label">Weight</label>
            <select
              className="input font-semibold"
              value={form.weight || '1kg'}
              onChange={(e) => setForm((f: any) => ({ ...f, weight: e.target.value }))}
            >
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Price/Unit (₹) *</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Per cake"
                value={form._unit_price}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, '')
                  const unit = Math.round(parseFloat(cleanVal) || 0)
                  const qty = parseInt(form.quantity) || 1
                  setForm((f: any) => ({ ...f, _unit_price: cleanVal, amount: String(unit * qty) }))
                }}
                required
              />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.quantity}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, '')
                  const qty = parseInt(cleanVal) || 1
                  const unit = Math.round(parseFloat(form._unit_price) || 0)
                  setForm((f: any) => ({ ...f, quantity: cleanVal, amount: String(unit * qty) }))
                }}
              />
            </div>
            <div>
              <label className="label">Total (₹)</label>
              <input
                className="input bg-gray-50 font-bold text-primary-600"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.amount}
                onChange={(e) => {
                  const cleanVal = e.target.value.replace(/[^0-9]/g, '')
                  setForm((f: any) => ({ ...f, amount: cleanVal }))
                }}
                placeholder="Auto-filled"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Delivery Date</label>
            <input className="input" type="date" value={form.delivery_date} onChange={set('delivery_date')} />
          </div>
          <div>
            <label className="label">Payment</label>
            <select className="input font-semibold" value={form.payment_status} onChange={set('payment_status')}>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="half">Half Payment</option>
            </select>
          </div>

          {form.payment_status === 'half' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/30 border border-blue-100 rounded-2xl">
              <div>
                <label className="label text-blue-700 font-bold">Paid Amount (₹) *</label>
                <input
                  className="input font-bold text-blue-600 bg-white"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.paid_amount || ''}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, '')
                    setForm((f: any) => ({ ...f, paid_amount: cleanVal }))
                  }}
                  required
                />
              </div>
              <div>
                <label className="label text-gray-500 font-bold">Remaining Balance</label>
                <div className="input bg-gray-50/50 font-bold text-gray-700 flex items-center">
                  ₹{Math.max(0, (Math.round(parseFloat(form.amount) || 0) - Math.round(parseFloat(form.paid_amount) || 0))).toLocaleString()}
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any special notes…" />
          </div>
        </div>

        <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }} className="btn-primary w-full py-4 text-base">
          {loading ? 'Saving…' : isEdit ? 'Update Order' : 'Create Manual Order'}
        </motion.button>
      </form>
    </div>
  )
}
