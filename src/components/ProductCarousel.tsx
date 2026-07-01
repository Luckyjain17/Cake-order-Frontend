import { useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProductListItem } from '@/types'
import ProductCard from './ProductCard'

interface Props {
  title: string
  viewAllLink?: string
  products: ProductListItem[]
  loading?: boolean
}

export default function ProductCarousel({ title, viewAllLink, products, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="skeleton h-7 w-40 rounded-xl" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 sm:w-52 skeleton aspect-[3/4] rounded-3xl" />
          ))}
        </div>
      </section>
    )
  }

  if (!products.length) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between page-container">
        <h2 className="section-title">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-primary-500 text-sm font-semibold">
            View all <ChevronRight size={16} />
          </Link>
        )}
      </div>
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto hide-scrollbar touch-scroll px-4 sm:px-6 lg:px-8 pb-2"
      >
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-44 sm:w-52 snap-item">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
