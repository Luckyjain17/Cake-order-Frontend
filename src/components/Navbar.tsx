import { useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Search, User, LayoutDashboard, HelpCircle, Phone } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export default function Navbar() {
  const { totalItems } = useCart()
  const { isAuthenticated } = useAuth()
  const [showHelpModal, setShowHelpModal] = useState(false)

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

  const handleHelpClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setShowHelpModal(true)
  }

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
          <Link
            to="/#contact-support"
            onClick={handleHelpClick}
            className="btn-icon text-gray-600 hover:text-primary-500 hover:bg-pink-50/20"
            title="Help & Contact"
          >
            <HelpCircle size={20} />
          </Link>
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

    {showHelpModal && (
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-lifted">
          <div className="w-16 h-16 bg-pink-50 text-primary-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <HelpCircle size={28} />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Need help?</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Reach out to us directly for order support, custom cakes, or payment help.
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
    </div>
  )
}

