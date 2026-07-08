import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader2, Megaphone, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import api, { getImageUrl } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

const QR_CODE_URL = import.meta.env.VITE_QR_CODE_URL || ''

function buildWhatsAppMessage(order: any, form: any) {
  const items = (order.items || [])
    .map((i: any) => 
      `• *${i.name}* (Qty: ${i.qty})\n` +
      `  ⚖️ Weight: ${i.weight || 'Standard'}\n` +
      `  🍰 Flavor: ${i.flavor || 'None'}\n` +
      `  🆔 Product ID: ${i.product_id}`
    )
    .join('\n\n')
  return encodeURIComponent(
    `🎂 *New Cake Order — ${order.order_number}*\n\n` +
    `*Customer:* ${form?.customer_name}\n` +
    `*Mobile:* ${form?.mobile_number}\n` +
    `*Address:* ${form?.delivery_address}${form?.landmark ? ', ' + form?.landmark : ''}\n` +
    `*Delivery:* ${form?.delivery_date || 'Flexible'} ${form?.delivery_time || ''}\n\n` +
    `*Order Items:*\n${items}\n\n` +
    `*Total: ₹${order.total_amount}*\n\n` +
    (form?.special_instructions ? `*Note:* ${form.special_instructions}\n\n` : '') +
    `Payment: ${order.payment_method === 'qr_code' ? 'UPI/QR (Screenshot attached)' : 'Pending'}`
  )
}

export default function PaymentPage() {
  const { orderNumber } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [isProcessing, setIsProcessing] = useState(false)

  const order = state?.order
  const paymentMethod = state?.paymentMethod
  const form = state?.form

  const { data: qrSetting } = useQuery({
    queryKey: ['settings', 'upi_qr_code'],
    queryFn: () => api.get('/settings/upi_qr_code').then((r) => r.data),
  })

  const { data: upiIdSetting } = useQuery({
    queryKey: ['settings', 'upi_id'],
    queryFn: () => api.get('/settings/upi_id').then((r) => r.data),
  })

  const { data: payeeNameSetting } = useQuery({
    queryKey: ['settings', 'payee_name'],
    queryFn: () => api.get('/settings/payee_name').then((r) => r.data),
  })

  const customQrUrl = getImageUrl(qrSetting?.value || undefined)
  const isUpiOffline = upiIdSetting ? (upiIdSetting.value === '' && !customQrUrl) : false
  const activeUpiId = upiIdSetting?.value === null ? '8269412418@ybl' : (upiIdSetting?.value || '')
  const activePayeeName = payeeNameSetting?.value === null ? "Manu's Cake Shop" : (payeeNameSetting?.value || '')
  const activeWhatsappNumber = '918269412418'
  const orderAmount = order?.total_amount || 0
  const note = `Order_${orderNumber}`

  const upiPayLink = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${orderAmount}&tn=${encodeURIComponent(note)}&cu=INR`
  const dynamicQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiPayLink)}`
  const activeQrCodeUrl = activeUpiId ? dynamicQrCodeUrl : (customQrUrl || QR_CODE_URL)

  const waMsg = buildWhatsAppMessage(order, form)
  const waUrl = `https://wa.me/${activeWhatsappNumber}?text=${waMsg}`

  // If WhatsApp order — open WA immediately
  if (paymentMethod === 'whatsapp') {
    window.open(waUrl, '_blank')
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <span className="text-7xl">💬</span>
        </motion.div>
        <h2 className="font-display text-2xl font-bold text-gray-900 text-center">WhatsApp is opening!</h2>
        <p className="text-gray-500 text-sm text-center">Your order details have been pre-filled. Just tap Send in WhatsApp.</p>
        <p className="text-xs text-gray-400 text-center">Order: <strong>{orderNumber}</strong></p>
        <button onClick={() => window.open(waUrl, '_blank')} className="btn-primary mt-2">
          Open WhatsApp Again
        </button>
        <button onClick={() => navigate('/')} className="btn-ghost">Back to Home</button>
      </div>
    )
  }

  // QR Code flow
  const handlePaymentSuccess = () => {
    setPaymentStatus('success')
    window.open(waUrl, '_blank')
  }

  const handlePaymentFailed = () => {
    setPaymentStatus('failed')
  }

  if (paymentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 gap-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <CheckCircle size={80} className="text-green-500" />
        </motion.div>
        <h2 className="font-display text-2xl font-bold text-gray-900 text-center">Payment Marked!</h2>
        <div className="card p-5 w-full max-w-sm bg-red-50 border-2 border-red-200 shadow-lg text-center animate-pulse">
          <p className="text-red-600 font-extrabold text-base flex items-center justify-center gap-1.5">
            ⚠️ ACTION REQUIRED!
          </p>
          <p className="text-red-700 font-bold text-sm mt-3 leading-normal">
            You MUST share your payment screenshot on WhatsApp!
          </p>
          <p className="text-red-600 text-xs mt-2 font-semibold leading-normal">
            Otherwise, your order will NOT start being prepared. Please click "Open WhatsApp" below to send it now.
          </p>
        </div>
        <p className="text-xs text-gray-400">Order: <strong>{orderNumber}</strong></p>
        <button onClick={() => window.open(waUrl, '_blank')} className="btn-primary">
          Open WhatsApp Again
        </button>
        <button onClick={() => navigate('/')} className="btn-ghost">Back to Home</button>
      </div>
    )
  }

  return (
    <div className="pb-nav">
      {!isUpiOffline && paymentStatus === 'pending' && (
        <motion.div 
          animate={{ 
            backgroundColor: ['#f59e0b', '#d97706', '#f59e0b'],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-white text-xs font-bold text-center py-3 px-4 shadow-md select-none leading-normal border-b border-amber-600/20 flex items-center justify-center gap-2"
        >
          <motion.span
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
            className="flex-shrink-0"
          >
            <Megaphone size={14} className="fill-white/20" />
          </motion.span>
          <span>
            IMPORTANT: After paying, you MUST click the "Payment Successful" button below to confirm your order!
          </span>
        </motion.div>
      )}
      <div className="page-container py-4 max-w-sm mx-auto">
        <h1 className="font-display text-2xl font-bold text-gray-900 text-center mb-1">Pay Now</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Order #{orderNumber}</p>

        {isUpiOffline ? (
          <div className="card p-6 border border-amber-100 bg-amber-50/50 text-center space-y-4 shadow-sm rounded-3xl mt-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-550 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <h3 className="font-bold text-gray-900 text-base">Payment Offline</h3>
            <p className="text-gray-600 text-xs leading-normal">
              Online UPI payment is temporarily unavailable. Please click below to send your order details on WhatsApp and complete your transaction.
            </p>
            <button
              onClick={() => window.open(waUrl, '_blank')}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba56] text-white border-0 shadow-md font-bold rounded-2xl"
            >
              💬 Complete via WhatsApp
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-ghost w-full py-2.5 text-xs font-bold text-gray-450 mt-2"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <>
            {/* Amount */}
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-gray-900">₹{order?.total_amount?.toLocaleString()}</p>
              <p className="text-gray-400 text-sm mt-1">Scan QR with any UPI app</p>
            </div>

            {/* QR Code */}
            <div className="card p-6 flex flex-col items-center gap-4">
              {activeQrCodeUrl ? (
                <>
                  <img src={activeQrCodeUrl} alt="UPI QR Code" className="w-56 h-56 object-contain rounded-2xl bg-white p-1 border border-gray-100" />
                  {activeUpiId && (
                    <div className="text-center">
                      <p className="text-xs font-bold text-primary-500">Scan to pay exactly ₹{orderAmount}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">UPI ID: {activeUpiId}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-56 h-56 bg-gray-100 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <span className="text-5xl">📱</span>
                  <p className="text-xs text-gray-400 text-center">Add your UPI QR code in settings</p>
                </div>
              )}

              {activeUpiId && (
                <div className="w-full space-y-2">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center">Pay directly via:</p>
                  <div className="flex flex-col gap-2">
                    <a
                      href={`gpay://upi/pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${orderAmount}&tn=${encodeURIComponent(note)}&cu=INR`}
                      className="py-3 rounded-2xl bg-white border border-gray-150 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Google Pay
                    </a>
                    <a
                      href={`phonepe://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${orderAmount}&tn=${encodeURIComponent(note)}&cu=INR`}
                      className="py-3 rounded-2xl bg-white border border-gray-150 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="24" rx="6" fill="#6739B6" />
                        <path d="M12 6v12M12 6c2.5 0 4.5 1.5 4.5 3.75s-2 3.75-4.5 3.75" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13.5" r="1.5" fill="white" />
                      </svg>
                      PhonePe
                    </a>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-400 text-center leading-normal">
                {activeUpiId
                  ? "Select Google Pay or PhonePe to pay directly from your phone. Otherwise, scan the QR code using any UPI app."
                  : `Open PhonePe, GPay, Paytm or any UPI app → Scan QR → Enter ₹${order?.total_amount}`
                }
              </p>
            </div>

            {/* Payment status buttons */}
            {paymentStatus === 'pending' && (
              <div className="mt-6 space-y-3">
                <motion.button
                  whileTap={isProcessing ? undefined : { scale: 0.96 }}
                  onClick={isProcessing ? undefined : handlePaymentSuccess}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-85 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} /> Payment Successful
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePaymentFailed}
                  className="w-full py-4 rounded-2xl bg-white border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  <XCircle size={20} /> Payment Not Successful
                </motion.button>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="mt-6 space-y-3">
                <div className="card p-4 bg-red-50 border border-red-100 text-center">
                  <p className="text-red-600 font-semibold">Payment failed or cancelled</p>
                  <p className="text-red-400 text-sm mt-1">Please try again or order via WhatsApp</p>
                </div>
                <button onClick={() => setPaymentStatus('pending')} className="btn-primary w-full">
                  Try Again
                </button>
                <button onClick={() => window.open(waUrl, '_blank')} className="w-full py-3 rounded-2xl bg-[#25D366] text-white font-semibold flex items-center justify-center gap-2">
                  💬 Order via WhatsApp Instead
                </button>
              </div>
            )}

            {/* Help / Contact Info */}
            <div className="mt-8 border-t border-dashed border-gray-150 pt-6">
              <div className="card p-4 bg-gray-50 border border-gray-100/50 text-center space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Need Help with your Payment?</p>
                <p className="text-xs text-gray-400 leading-normal">
                  If you face any issues or want to verify your order, feel free to contact us:
                </p>
                <div className="flex justify-center gap-3">
                  <a
                    href="tel:+918269412418"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm active:scale-95 transition-all"
                  >
                    <Phone size={14} className="text-primary-500" />
                    Call Us
                  </a>
                  <a
                    href="https://www.instagram.com/homemade_mapas_cakes?igsh=b28xZTN2NTVucjF0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm active:scale-95 transition-all"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
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
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
