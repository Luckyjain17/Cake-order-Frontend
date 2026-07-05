import { MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export default function WhatsAppFab() {
  const activeWhatsappNumber = '918269412418';
  const handleClick = () => {
    const msg = encodeURIComponent("Hi! I'd like to order a cake 🎂")
    window.open(`https://wa.me/${activeWhatsappNumber}?text=${msg}`, '_blank')
  }

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 300 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className="fixed bottom-24 right-4 md:bottom-6 z-30 w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lifted flex items-center justify-center"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={26} fill="white" strokeWidth={0} />
    </motion.button>
  )
}

