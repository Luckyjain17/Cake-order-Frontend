import { Link } from 'react-router-dom'
import { Search, User, LayoutDashboard } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export default function Navbar() {
  const { totalItems } = useCart()
  const { isAuthenticated } = useAuth()

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

  // Format reopen date for banner readability (medium date, short time)
  const formattedReopen = reopenTime 
    ? new Date(reopenTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : ''

  return (
    <div className="sticky top-0 z-30 flex flex-col">
      {isClosed && (
        <div className="bg-red-500 text-white text-xs font-bold text-center py-2.5 px-4 shadow-sm select-none tracking-wide">
          ⚠️ Store is temporarily closed. {formattedReopen ? `Reopening on: ${formattedReopen}. ` : ''}Online ordering is disabled.
        </div>
      )}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="page-container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Homemade Mapas Cake" className="w-10 h-10 rounded-full object-cover border border-pink-100 shadow-sm" />
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
    </div>
  )
}

