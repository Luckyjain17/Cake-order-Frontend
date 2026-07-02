import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminLayout from '@/layouts/AdminLayout'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'

// Customer pages
import HomePage from '@/pages/HomePage'
import ShopPage from '@/pages/ShopPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CartPage from '@/pages/CartPage'
import CheckoutPage from '@/pages/CheckoutPage'
import PaymentPage from '@/pages/PaymentPage'
import SearchPage from '@/pages/SearchPage'

// Admin pages
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminProductsPage from '@/pages/admin/AdminProductsPage'
import AdminProductFormPage from '@/pages/admin/AdminProductFormPage'
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage'
import AdminManualOrderPage from '@/pages/admin/AdminManualOrderPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'

function CustomerLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <BottomNav />
    </>
  )
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Customer routes */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/:orderNumber" element={<PaymentPage />} />
              <Route path="/search" element={<SearchPage />} />
            </Route>

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
            <Route path="/admin/products" element={<AdminGuard><AdminProductsPage /></AdminGuard>} />
            <Route path="/admin/products/new" element={<AdminGuard><AdminProductFormPage /></AdminGuard>} />
            <Route path="/admin/products/edit/:id" element={<AdminGuard><AdminProductFormPage /></AdminGuard>} />
            <Route path="/admin/orders" element={<AdminGuard><AdminOrdersPage /></AdminGuard>} />
            <Route path="/admin/orders/new" element={<AdminGuard><AdminManualOrderPage /></AdminGuard>} />
            <Route path="/admin/settings" element={<AdminGuard><AdminSettingsPage /></AdminGuard>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
