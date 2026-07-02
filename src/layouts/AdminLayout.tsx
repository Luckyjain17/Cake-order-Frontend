import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LayoutDashboard, ShoppingBag, Package, ClipboardList, LogOut, Plus, Globe, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 fixed inset-y-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full object-cover border border-pink-100 shadow-sm" />
            <div>
              <p className="font-display font-bold text-gray-900">Admin Panel</p>
              <p className="text-xs text-gray-400">{admin?.username}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                  active ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 w-full transition-all">
            <Globe size={18} /> View Website
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-red-400 hover:bg-red-50 w-full transition-all">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 md:hidden">
        <div className="flex items-center justify-around h-16">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to)
            return (
              <Link key={to} to={to} className="flex flex-col items-center gap-0.5">
                <motion.div animate={{ scale: active ? 1.15 : 1 }} transition={{ type: 'spring' }}
                  className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-gray-400'}`}>
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                </motion.div>
                <span className={`text-[10px] font-medium ${active ? 'text-primary-500' : 'text-gray-400'}`}>{label}</span>
              </Link>
            )
          })}
          <Link to="/" className="flex flex-col items-center gap-0.5 text-gray-400">
            <Globe size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Store</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 text-red-400">
            <LogOut size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
