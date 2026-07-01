import { Link } from 'react-router-dom'
import { Search, User, LayoutDashboard } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
  const { totalItems } = useCart()
  const { isAuthenticated } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🎂</span>
          <span className="font-display text-lg font-bold text-gray-900 hidden sm:block">
            Manu's Cakes
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to="/search" className="btn-icon text-gray-600">
            <Search size={20} />
          </Link>
          {/* Smart admin icon: goes to dashboard if logged in, else to login */}
          <Link
            to={isAuthenticated ? '/admin' : '/admin/login'}
            className="btn-icon text-gray-600"
            title={isAuthenticated ? 'Go to Dashboard' : 'Admin Login'}
          >
            {isAuthenticated ? <LayoutDashboard size={20} /> : <User size={20} />}
          </Link>
        </div>
      </div>
    </header>
  )
}

