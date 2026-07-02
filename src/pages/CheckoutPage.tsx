import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

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

  const { data: upiIdSetting } = useQuery({
    queryKey: ['settings', 'upi_id'],
    queryFn: () => api.get('/settings/upi_id').then((r) => r.data).catch(() => null),
  })
  const isUpiOffline = !upiIdSetting?.value // empty/unset or not exists

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
        window.location.href = `https://wa.me/918269412418?text=${encodeURIComponent(waMsg)}`
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
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-400 mt-0.5">Please review your order details below</p>
        </div>

        {/* Order summary */}
        <div className="card p-5 border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm">{items.length} item(s) in cart</h2>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.product_id}-${item.weight}`} className="flex justify-between text-sm text-gray-600">
                <span className="truncate mr-3">
                  {item.name} <span className="text-gray-400 font-medium">× {item.qty}</span>
                  {item.weight && <span className="text-gray-400 text-xs ml-1">({item.weight})</span>}
                </span>
                <span className="font-bold text-gray-700 flex-shrink-0">
                  ₹{(item.price * item.qty).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-100 pt-3 flex justify-between font-bold text-base text-gray-900">
            <span>Total Amount</span>
            <span className="text-primary-500">₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={isUpiOffline ? undefined : { scale: 0.97 }}
            onClick={isUpiOffline ? undefined : () => setShowModal(true)}
            disabled={loading || isUpiOffline}
            className={`w-full text-lg py-4 flex items-center justify-center gap-2 rounded-2xl font-bold transition-all ${isUpiOffline ? 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200' : 'btn-primary'}`}
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>📱</span>
                <span>{isUpiOffline ? 'UPI Payment (Temporarily Offline)' : 'Pay via UPI / QR Code (Barcode)'}</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleWhatsAppOrder}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba56] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-soft active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>💬</span>
                <span>Order via WhatsApp Directly</span>
              </>
            )}
          </motion.button>
          <p className="text-[10px] text-gray-400 text-center font-medium leading-relaxed">
            Choose a payment option. Both methods register your order and open WhatsApp to share details directly to us.
          </p>
        </div>
      </div>

      {/* Screenshot Warning Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-lifted animate-scale-in">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl">
              ⚠️
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
