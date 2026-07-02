export interface ProductImage {
  id: number
  cloudinary_public_id: string
  url: string
  thumbnail_url?: string
  medium_url?: string
  large_url?: string
  alt_text?: string
  image_type?: string
  sort_order: number
  is_cover: boolean
}

export interface Product {
  id: number
  name: string
  slug: string
  short_description?: string
  full_description?: string
  category_id?: number
  cake_type?: string
  flavor?: string
  shape?: string
  weight_options?: string
  original_price: number
  selling_price: number
  discount_percent: number
  price_base_weight?: string
  preparation_time?: string
  serves?: string
  storage_instructions?: string
  is_customizable: boolean
  is_available: boolean
  is_best_seller: boolean
  is_trending: boolean
  is_new_arrival: boolean
  is_eggless: boolean
  rating: number
  rating_count: number
  total_sold: number
  images: ProductImage[]
  cover_image?: ProductImage
  created_at: string
  updated_at?: string
}

export interface ProductListItem {
  id: number
  name: string
  slug: string
  short_description?: string
  selling_price: number
  original_price: number
  discount_percent: number
  flavor?: string
  is_available: boolean
  is_best_seller: boolean
  is_trending: boolean
  is_new_arrival: boolean
  rating: number
  cover_image?: ProductImage
  category_id?: number
  price_base_weight?: string
}

export interface PaginatedProducts {
  items: ProductListItem[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string
  icon?: string
  image_url?: string
  sort_order: number
  is_active: boolean
  product_count?: number
}

export interface CartItem {
  product_id: number
  name: string
  slug: string
  image_url?: string
  weight: string
  price: number
  qty: number
}

export interface Order {
  id: number
  order_number: string
  customer_name: string
  mobile_number: string
  delivery_address: string
  landmark?: string
  delivery_date?: string
  delivery_time?: string
  special_instructions?: string
  items: CartItem[]
  subtotal: number
  total_amount: number
  payment_method?: string
  payment_status: string
  status: string
  order_source: string
  created_at: string
}

export interface ManualOrder {
  id: number
  order_number: string
  customer_name: string
  mobile_number: string
  address?: string
  cake_name: string
  quantity: number
  weight?: string
  amount: number
  paid_amount?: number
  order_source: string
  payment_status: string
  status: string
  notes?: string
  delivery_date?: string
  created_at: string
}

export interface AdminUser {
  id: number
  username: string
  email: string
  is_active: boolean
}

export interface DashboardStats {
  today_orders: number
  weekly_orders: number
  monthly_orders: number
  total_orders: number
  today_revenue: number
  monthly_revenue: number
  total_revenue: number
  avg_order_value: number
  total_cakes_sold: number
  best_selling_cake?: string
  best_selling_category?: string
  pending_orders: number
  completed_orders: number
  cancelled_orders: number
  manual_orders: number
  website_orders: number
  whatsapp_orders: number
  phone_orders: number
  monthly_sales_chart: Array<{ month: string; revenue: number }>
  daily_orders_chart: Array<{ day: string; orders: number }>
  category_sales_chart: Array<{ category: string; sales: number }>
  best_selling_products: Array<{ name: string; sold: number }>
}
