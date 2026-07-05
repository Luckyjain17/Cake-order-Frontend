import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { CartItem } from '@/types'

const CART_KEY = 'cake_cart'

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (product_id: number, weight: string) => void
  updateQty: (product_id: number, weight: string, qty: number) => void
  clearCart: () => void
  totalItems: number
  totalAmount: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []

    try {
      const stored = window.localStorage.getItem(CART_KEY)
      if (!stored) return []

      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage write issues
    }
  }, [items])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CART_KEY) return
      try {
        if (!event.newValue) {
          setItems([])
          return
        }
        const parsed = JSON.parse(event.newValue)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      } catch {
        // Ignore invalid storage updates
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === newItem.product_id && i.weight === newItem.weight,
      )
      if (existing) {
        return prev.map((i) =>
          i.product_id === newItem.product_id && i.weight === newItem.weight
            ? { ...i, qty: i.qty + newItem.qty }
            : i,
        )
      }
      return [...prev, newItem]
    })
  }

  const removeItem = (product_id: number, weight: string) => {
    setItems((prev) => prev.filter((i) => !(i.product_id === product_id && i.weight === weight)))
  }

  const updateQty = (product_id: number, weight: string, qty: number) => {
    if (qty <= 0) {
      removeItem(product_id, weight)
      return
    }
    setItems((prev) =>
      prev.map((i) =>
        i.product_id === product_id && i.weight === weight ? { ...i, qty } : i,
      ),
    )
  }

  const clearCart = () => setItems([])

  const totalItems = items.reduce((s, i) => s + i.qty, 0)
  const totalAmount = items.reduce((s, i) => s + i.price * i.qty, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
