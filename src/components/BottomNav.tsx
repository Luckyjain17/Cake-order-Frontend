import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Cake } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { motion } from 'framer-motion'

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/shop', label: 'Shop', icon: Cake },
  { to: '/cart', label: 'Cart', icon: ShoppingBag },
]

export default function BottomNav() {
  const { pathname } = useLocation()
  const { totalItems } = useCart()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 safe-area-pb md:hidden">
      <div className="flex items-center justify-around h-16">
        {nav.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <Link key={to} to={to} className="flex flex-col items-center gap-0.5 relative">
              <motion.div
                animate={{ scale: active ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`w-6 h-6 relative ${active ? 'text-primary-500' : 'text-gray-400'}`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {to === '/cart' && totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary-500 text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </motion.div>
              <span className={`text-[10px] font-medium ${active ? 'text-primary-500' : 'text-gray-400'}`}>
                {label}
              </span>
              {active && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
