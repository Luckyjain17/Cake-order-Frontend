import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { motion } from 'framer-motion'
import api, { getImageUrl } from '@/lib/api'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { QrCode, MessageCircle, AlertTriangle, HelpCircle, Phone } from 'lucide-react'

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  const formatRupee = (v: number | string | undefined) => {
    const n = Number(v) || 0
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(n)
  }

  const { data: storeSetting } = useQuery({
    queryKey: ['settings', 'store_status'],
    queryFn: () => api.get('/settings/store_status').then((r) => r.data).catch(() => null),
  })

  const { data: reopenSetting } = useQuery({
    queryKey: ['settings', 'store_reopen_time'],
    queryFn: () => api.get('/settings/store_reopen_time').then((r) => r.data).catch(() => null),
  })
  const reopenTime = reopenSetting?.value

  const isClosed = (() => {
    if (storeSetting?.value !== 'closed') return false
    if (!reopenTime) return true
    const reopenDate = new Date(reopenTime)
    if (isNaN(reopenDate.getTime())) return true
    return new Date() < reopenDate
  })()

  const { data: qrSetting } = useQuery({
    queryKey: ['settings', 'upi_qr_code'],
    queryFn: () => api.get('/settings/upi_qr_code').then((r) => r.data).catch(() => null),
  })
  const customQrUrl = qrSetting?.value ? getImageUrl(qrSetting.value) : undefined

  const { data: upiIdSetting } = useQuery({
    queryKey: ['settings', 'upi_id'],
    queryFn: () => api.get('/settings/upi_id').then((r) => r.data).catch(() => null),
  })
  const isUpiOffline = !upiIdSetting?.value && !customQrUrl

  const activeWhatsappNumber = '918269412418';

  if (isClosed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <span className="text-5xl">🔴</span>
        <h2 className="font-display text-xl font-bold text-gray-700">Store is Closed</h2>
        <p className="text-gray-400 text-sm">We are currently closed. Checkout is temporarily disabled.</p>
        <Link to="/" className="btn-primary mt-2">Go back to Home</Link>
      </div>
    )
  }

  const handleWhatsAppOrder = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    setLoading(true)
    try {
      // Auto-submit order with default pickup info so it's logged in the admin panel
      const { data } = await api.post('/orders/', {
        customer_name: 'WhatsApp Customer',
        mobile_number: 'WhatsApp',
        delivery_address: 'Self-Pickup',
        landmark: '',
        delivery_date: '',
        delivery_time: '',
        special_instructions: '',
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          slug: i.slug,
          qty: i.qty,
          weight: i.weight,
          price: i.price,
          image_url: i.image_url,
        })),
        subtotal: totalAmount,
        total_amount: totalAmount,
        payment_method: 'whatsapp',
        order_source: 'website',
      })

      // Generate a clean summary message with direct product page links (using ID for uniqueness)
      const itemsList = items
        .map((item) => `• *${item.name}* x ${item.qty} (${item.weight || 'Standard'})\n  🔗 Link: ${window.location.origin}/product/${item.product_id}`)
        .join('\n')

      const waMsg = `Hello! I would like to place an order:\n\n📋 *Order ID:* #${data.order_number}\n🛍️ *Items:* \n${itemsList}\n\n💰 *Total Amount:* ₹${totalAmount}\n\nPlease confirm my order. Thank you!`

      toast.success('Order recorded! Redirecting to WhatsApp...')

      clearCart()
      navigate('/', { replace: true })

      // Delay slightly for toast/state updates, then redirect
      setTimeout(() => {
        window.location.href = `https://wa.me/${activeWhatsappNumber}?text=${encodeURIComponent(waMsg)}`
      }, 800)
    } catch (err) {
      toast.error('Failed to process order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePayViaQRCode = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    setLoading(true)
    try {
      // Auto-submit order with default pickup info so it's logged in the admin panel
      const { data } = await api.post('/orders/', {
        customer_name: 'WhatsApp Customer',
        mobile_number: 'WhatsApp',
        delivery_address: 'Self-Pickup',
        landmark: '',
        delivery_date: '',
        delivery_time: '',
        special_instructions: '',
        items: items.map((i) => ({
          product_id: i.product_id,
          name: i.name,
          slug: i.slug,
          qty: i.qty,
          weight: i.weight,
          price: i.price,
          image_url: i.image_url,
        })),
        subtotal: totalAmount,
        total_amount: totalAmount,
        payment_method: 'qr_code',
        order_source: 'website',
      })

      toast.success('Order recorded! Redirecting to payment...')
      clearCart()

      navigate(`/payment/${data.order_number}`, {
        state: {
          order: data,
          paymentMethod: 'qr_code',
          form: {
            customer_name: 'WhatsApp Customer',
            mobile_number: 'WhatsApp',
            delivery_address: 'Self-Pickup',
          }
        }
      })
    } catch (err) {
      toast.error('Failed to process order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-nav">
      <div className="page-container py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-400 mt-0.5">Please review your order details below</p>
          </div>
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 rounded-full border border-pink-100 bg-pink-50 px-3 py-2 text-xs font-semibold text-primary-600 shadow-sm transition-all hover:bg-pink-100"
          >
            <HelpCircle size={14} />
            Help
          </button>
        </div>

        {/* Order summary */}
        <div className="card p-5 border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">{items.length} item(s) in cart</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.product_id}-${item.weight}`} className="flex justify-between items-center text-sm text-gray-600">
                <div className="truncate mr-3">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400">× {item.qty} {item.weight && <>• {item.weight}</>}</div>
                </div>
                <div className="font-bold text-gray-700 flex-shrink-0">₹{formatRupee(item.price * item.qty)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-100 pt-3 flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-600">Total Amount</div>
              <div className="text-xs text-gray-400">Including taxes & charges</div>
            </div>
            <div className="text-primary-500 font-extrabold text-lg">₹{formatRupee(totalAmount)}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={isUpiOffline ? undefined : { scale: 0.98 }}
            onClick={isUpiOffline ? undefined : () => setShowModal(true)}
            disabled={loading || isUpiOffline}
            className={`w-full text-base py-4 flex items-center justify-center gap-3 rounded-3xl font-bold transition-transform transform ${isUpiOffline ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-gradient-to-r from-[#ff6b8b] to-[#ff4d6d] text-white shadow-2xl hover:-translate-y-0.5'}`}
          >
            {loading ? (
              <span className="text-sm font-semibold">Processing...</span>
            ) : (
              <>
                <QrCode size={22} />
                <span className="text-lg">{isUpiOffline ? 'UPI Payment (Temporarily Offline)' : 'Pay via UPI / QR Code'}</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleWhatsAppOrder}
            disabled={loading}
            className="w-full py-4 rounded-3xl bg-[#25D366] hover:bg-[#20ba56] text-white font-bold text-lg flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-transform disabled:opacity-60"
          >
            {loading ? (
              <span className="text-sm font-semibold">Processing...</span>
            ) : (
              <>
                <MessageCircle size={22} />
                <span>Order via WhatsApp</span>
              </>
            )}
          </motion.button>
          <p className="text-[10px] text-gray-400 text-center font-medium leading-relaxed">
            Choose a payment option. Both methods register your order and open WhatsApp to share details directly to us.
          </p>
        </div>
      </div>

      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-lifted animate-scale-in">
            <div className="w-16 h-16 bg-pink-50 text-primary-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <HelpCircle size={28} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Need help?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Reach out to us directly for order support, custom cake requests, or payment help.
            </p>

            <div className="space-y-2 pt-2">
              <a
                href="tel:+918269412418"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
              >
                <Phone size={16} className="text-primary-500" />
                Call Support
              </a>
              <a
                href="https://www.instagram.com/homemade_mapas_cakes?igsh=b28xZTN2NTVucjF0"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Warning Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-lifted animate-scale-in">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={28} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Screenshot Required!</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              After you pay, you <strong>MUST</strong> send the payment screenshot to us on WhatsApp.
            </p>
            <p className="text-red-500 font-bold text-xs bg-red-50 py-2.5 px-4 rounded-xl border border-red-100 leading-normal">
              Your order will NOT start being prepared until you share the payment screenshot! 🎂
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowModal(false)
                  handlePayViaQRCode()
                }}
                className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl text-sm active:scale-95 transition-all shadow-md"
              >
                I Understand, Proceed to Pay
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3.5 bg-gray-50 text-gray-500 font-bold rounded-2xl text-sm hover:bg-gray-100 active:scale-95 transition-all"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
