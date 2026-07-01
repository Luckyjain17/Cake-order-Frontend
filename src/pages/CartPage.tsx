import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function CartPage() {
  const { items, removeItem, updateQty, totalAmount } = useCart()

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <ShoppingBag size={64} className="text-gray-200" />
        </motion.div>
        <h2 className="font-display text-xl font-bold text-gray-700">Your cart is empty</h2>
        <p className="text-gray-400 text-sm text-center">Add some delicious cakes to your cart!</p>
        <Link to="/shop" className="btn-primary">Browse Cakes</Link>
      </div>
    )
  }

  return (
    <div className="pb-nav">
      <div className="page-container py-4">
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-4">My Cart</h1>

        <div className="space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={`${item.product_id}-${item.weight}`}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card p-4 flex gap-3 items-center"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">🎂</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.weight}</p>
                  <p className="text-primary-500 font-bold text-sm mt-1">₹{(item.price * item.qty).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQty(item.product_id, item.weight, item.qty - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.product_id, item.weight, item.qty + 1)}
                    className="w-7 h-7 rounded-full bg-primary-100 text-primary-500 flex items-center justify-center"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={() => removeItem(item.product_id, item.weight)}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center ml-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary */}
        <div className="mt-4 card p-4 space-y-3">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>₹{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Delivery</span>
            <span className="text-green-600 font-medium">Free</span>
          </div>
          <div className="divider" />
          <div className="flex justify-between font-bold text-gray-900 text-lg">
            <span>Total</span>
            <span>₹{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <Link to="/checkout" className="btn-primary w-full mt-4 text-center">
          Proceed to Checkout →
        </Link>
      </div>
    </div>
  )
}
