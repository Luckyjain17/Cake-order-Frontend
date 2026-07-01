import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/context/CartContext'
import { motion } from 'framer-motion'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

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
            whileTap={{ scale: 0.97 }}
            onClick={handlePayViaQRCode}
            disabled={loading}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>📱</span>
                <span>Pay via UPI / QR Code (Barcode)</span>
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
    </div>
  )
}
