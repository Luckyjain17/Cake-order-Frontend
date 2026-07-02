import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, User, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      login(data.access_token, data.admin)
      navigate('/admin/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-pink-500 rounded-3xl overflow-hidden flex items-center justify-center mx-auto shadow-lifted border border-pink-100">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 mt-4">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">HomeMade_MaPas Cake Shop</p>
          <p className="text-gray-400 text-sm mt-1">Dini Jain only can access this panel</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-10"
                placeholder="admin"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-10 pr-10"
                placeholder="••••••••"
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="btn-primary w-full py-3.5 text-base"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
          <Link to="/" className="text-sm font-semibold text-gray-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-1 mt-4">
            ← Back to Website
          </Link>
        </form>
      </motion.div>
    </div>
  )
}
