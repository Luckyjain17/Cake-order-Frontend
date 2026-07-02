import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle } from 'lucide-react'
import api, { getImageUrl } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '918269412418'
const QR_CODE_URL = import.meta.env.VITE_QR_CODE_URL || ''

function buildWhatsAppMessage(order: any, form: any) {
  const items = (order.items || [])
    .map((i: any) => `• *${i.name}* x ${i.qty} (${i.weight || 'Standard'})\n  🔗 Link: ${window.location.origin}/product/${i.product_id}`)
    .join('\n')
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
  const isUpiOffline = upiIdSetting ? upiIdSetting.value === '' : false
  const activeUpiId = upiIdSetting?.value === null ? '8269412418@ybl' : (upiIdSetting?.value || '')
  const activePayeeName = payeeNameSetting?.value === null ? "Manu's Cake Shop" : (payeeNameSetting?.value || '')
  const orderAmount = order?.total_amount || 0
  const note = `Order_${orderNumber}`

  const upiPayLink = `upi://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${orderAmount}&tn=${encodeURIComponent(note)}&cu=INR`
  const dynamicQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiPayLink)}`
  const activeQrCodeUrl = activeUpiId ? dynamicQrCodeUrl : (customQrUrl || QR_CODE_URL)

  const waMsg = buildWhatsAppMessage(order, form)
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`

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
  const handlePaymentSuccess = async () => {
    await api.patch(`/orders/admin/${order?.id}`, { payment_status: 'paid' }).catch(() => {})
    setPaymentStatus('success')
    // Open WhatsApp to send screenshot
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
                      🔵 Google Pay
                    </a>
                    <a
                      href={`phonepe://pay?pa=${activeUpiId}&pn=${encodeURIComponent(activePayeeName)}&am=${orderAmount}&tn=${encodeURIComponent(note)}&cu=INR`}
                      className="py-3 rounded-2xl bg-white border border-gray-150 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                    >
                      🟣 PhonePe
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
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePaymentSuccess}
                  className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-soft"
                >
                  <CheckCircle size={22} /> Payment Successful ✅
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handlePaymentFailed}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-500 font-bold text-lg flex items-center justify-center gap-2 border-2 border-red-200"
                >
                  <XCircle size={22} /> Payment Not Successful ❌
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
          </>
        )}
      </div>
    </div>
  )
}
