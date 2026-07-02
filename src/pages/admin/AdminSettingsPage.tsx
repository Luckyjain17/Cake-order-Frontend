import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, Loader2, Image as ImageIcon, QrCode, Save, Info, Trash2, Store } from 'lucide-react'
import api, { getImageUrl } from '@/lib/api'
import toast from 'react-hot-toast'

interface SettingResponse {
  key: string
  value: string | null
}

const formatErrorDetail = (err: any, fallback: string) => {
  const detail = err.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
  }
  return typeof detail === 'object' ? JSON.stringify(detail) : fallback
}

export default function AdminSettingsPage() {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [upiId, setUpiId] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [reopenTime, setReopenTime] = useState('')
  const [closeUntil, setCloseUntil] = useState('')
  const [savingUpi, setSavingUpi] = useState(false)
  const [savingPayee, setSavingPayee] = useState(false)
  const [savingReopen, setSavingReopen] = useState(false)

  // Fetch settings
  const { data: qrSetting, isLoading: loadQr } = useQuery<SettingResponse>({
    queryKey: ['adminSettings', 'upi_qr_code'],
    queryFn: () => api.get('/settings/upi_qr_code').then((r) => r.data),
  })

  const { data: upiIdSetting, isLoading: loadUpi } = useQuery<SettingResponse>({
    queryKey: ['adminSettings', 'upi_id'],
    queryFn: () => api.get('/settings/upi_id').then((r) => r.data),
  })

  const { data: payeeNameSetting, isLoading: loadPayee } = useQuery<SettingResponse>({
    queryKey: ['adminSettings', 'payee_name'],
    queryFn: () => api.get('/settings/payee_name').then((r) => r.data),
  })

  const { data: storeSetting, isLoading: loadStore } = useQuery<SettingResponse>({
    queryKey: ['adminSettings', 'store_status'],
    queryFn: () => api.get('/settings/store_status').then((r) => r.data),
  })

  const { data: reopenSetting, isLoading: loadReopen } = useQuery<SettingResponse>({
    queryKey: ['adminSettings', 'store_reopen_time'],
    queryFn: () => api.get('/settings/store_reopen_time').then((r) => r.data),
  })

  // Set default closeUntil to tomorrow 9 AM on mount
  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const pad = (num: number) => String(num).padStart(2, '0')
    const formatted = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`
    setCloseUntil(formatted)
  }, [])

  // Synchronize local state with loaded database settings
  useEffect(() => {
    if (upiIdSetting) {
      setUpiId(upiIdSetting.value === null ? '8269412418@ybl' : upiIdSetting.value)
    }
  }, [upiIdSetting])

  useEffect(() => {
    if (payeeNameSetting) {
      setPayeeName(payeeNameSetting.value === null ? "Manu's Cake Shop" : payeeNameSetting.value)
    }
  }, [payeeNameSetting])

  useEffect(() => {
    if (reopenSetting?.value) {
      setReopenTime(reopenSetting.value)
      setCloseUntil(reopenSetting.value)
    }
  }, [reopenSetting])

  // Upload mutation for the QR code image
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/settings/upi_qr_code/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings', 'upi_qr_code'] })
      toast.success('UPI QR Code updated successfully! 📱')
    },
    onError: (err: any) => {
      console.error(err)
      toast.error(formatErrorDetail(err, 'Failed to upload QR Code'))
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  // Delete QR Code image mutation
  const deleteQrMutation = useMutation({
    mutationFn: () => api.delete('/settings/upi_qr_code'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminSettings', 'upi_qr_code'] })
      toast.success('Custom QR Code image removed successfully! 🗑️')
    },
    onError: (err: any) => {
      toast.error(formatErrorDetail(err, 'Failed to remove QR Code'))
    }
  })

  // Save text setting mutation
  const saveSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const formData = new FormData()
      formData.append('value', value)
      const res = await api.post(`/settings/${key}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['adminSettings', variables.key] })
    },
    onError: (err: any) => {
      toast.error(formatErrorDetail(err, 'Failed to save setting'))
    },
    onSettled: (_, __, variables) => {
      if (variables.key === 'upi_id') setSavingUpi(false)
      if (variables.key === 'payee_name') setSavingPayee(false)
    },
  })

  const handleSaveUpi = (e: React.FormEvent) => {
    e.preventDefault()
    setSavingUpi(true)
    saveSettingMutation.mutate({ key: 'upi_id', value: upiId.trim() })
    toast.success('UPI ID updated successfully!')
  }

  const handleSavePayee = (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPayee(true)
    saveSettingMutation.mutate({ key: 'payee_name', value: payeeName.trim() })
    toast.success('Payee Name updated successfully!')
  }

  const handleCloseStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!closeUntil) return
    setSavingReopen(true)
    try {
      await saveSettingMutation.mutateAsync({ key: 'store_status', value: 'closed' })
      await saveSettingMutation.mutateAsync({ key: 'store_reopen_time', value: closeUntil })
      qc.invalidateQueries({ queryKey: ['adminSettings', 'store_status'] })
      qc.invalidateQueries({ queryKey: ['adminSettings', 'store_reopen_time'] })
      toast.success('Store closed until specified time! 🔴')
    } catch {
      toast.error('Failed to update store status')
    } finally {
      setSavingReopen(false)
    }
  }

  const handleOpenStore = async () => {
    setSavingReopen(true)
    try {
      await saveSettingMutation.mutateAsync({ key: 'store_status', value: 'open' })
      await saveSettingMutation.mutateAsync({ key: 'store_reopen_time', value: '' })
      qc.invalidateQueries({ queryKey: ['adminSettings', 'store_status'] })
      qc.invalidateQueries({ queryKey: ['adminSettings', 'store_reopen_time'] })
      setReopenTime('')
      toast.success('Store is now open! 🟢')
    } catch {
      toast.error('Failed to open store')
    } finally {
      setSavingReopen(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    setUploading(true)
    uploadMutation.mutate(file)
  }

  const qrImageUrl = getImageUrl(qrSetting?.value || undefined)
  const storeStatus = storeSetting?.value === 'closed' ? 'closed' : 'open'
  const isLoading = loadQr || loadUpi || loadPayee || loadStore || loadReopen

  return (
    <div className="p-4 space-y-6 pb-8 max-w-md mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage store configuration and payments</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-3xl" />
          <div className="skeleton h-48 rounded-3xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Store Status Card */}
          {storeStatus === 'open' ? (
            <div className="card p-5 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center">
                  <Store size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-base leading-none">Store Status</h2>
                  <p className="text-xs text-green-600 font-semibold mt-1">Open 🟢</p>
                </div>
              </div>

              <form onSubmit={handleCloseStore} className="space-y-3 pt-3 border-t border-gray-150">
                <p className="text-xs font-bold text-gray-500">Temporarily Close Store Until:</p>
                <div className="flex flex-col gap-2">
                  <input
                    type="datetime-local"
                    required
                    className="input text-xs py-2 bg-white"
                    value={closeUntil}
                    onChange={(e) => setCloseUntil(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={savingReopen}
                    className="btn-primary py-2.5 text-xs font-bold w-full bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm rounded-2xl"
                  >
                    {savingReopen ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Close Store 🔴'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card p-5 border border-red-150 bg-red-50/20 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                  <Store size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-base leading-none">Store Status</h2>
                  <p className="text-xs text-red-500 font-bold mt-1">Closed 🔴</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-red-100">
                <p className="text-xs text-gray-600 leading-normal">
                  The store is closed until:
                  <strong className="block text-sm text-gray-800 mt-1 font-bold">
                    {reopenTime ? new Date(reopenTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Indefinitely'}
                  </strong>
                </p>
                
                <button
                  type="button"
                  onClick={handleOpenStore}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
                >
                  {savingReopen ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Open Store Early 🟢'}
                </button>
              </div>
            </div>
          )}

          {/* Text Settings Cards */}
          <div className="card p-5 border border-gray-100 shadow-sm space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center">
                <Info size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-base leading-none">UPI Autofill Settings</h2>
                <p className="text-xs text-gray-400 mt-1">Configure details for dynamic QR generation</p>
              </div>
            </div>

            <p className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-100 leading-normal font-medium">
              💡 Leave both UPI ID and Payee Name empty to temporarily mark online payments as offline/down.
            </p>

            {/* UPI ID Form */}
            <form onSubmit={handleSaveUpi} className="space-y-2">
              <label className="label">UPI ID (VPA)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1 py-2 text-sm"
                  placeholder="e.g. 8269412418@ybl"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={savingUpi}
                  className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {savingUpi ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  Save
                </button>
              </div>
            </form>

            {/* Payee Name Form */}
            <form onSubmit={handleSavePayee} className="space-y-2">
              <label className="label">Payee Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1 py-2 text-sm"
                  placeholder="e.g. Manu's Cake Shop"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={savingPayee}
                  className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5 flex-shrink-0"
                >
                  {savingPayee ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  Save
                </button>
              </div>
            </form>
          </div>

          {/* QR Code Upload Card */}
          <div className="card p-5 border border-gray-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                  <QrCode size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 text-base leading-none">Fallback QR Code Image</h2>
                  <p className="text-xs text-gray-400 mt-1">Fallback barcode QR image</p>
                </div>
              </div>
              {qrSetting?.value && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete the custom QR code image?')) {
                      deleteQrMutation.mutate()
                    }
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Delete Custom Barcode"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Current QR Code display */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              {qrImageUrl ? (
                <div className="space-y-3 text-center w-full">
                  <img
                    src={qrImageUrl}
                    alt="Current UPI QR Code"
                    className="w-40 h-40 object-contain bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mx-auto"
                  />
                  <p className="text-[10px] text-gray-400 font-medium">Custom QR Barcode Active</p>
                </div>
              ) : (
                <div className="text-center p-4 space-y-1.5">
                  <ImageIcon size={32} className="text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500 font-semibold">No Custom QR Code Image</p>
                  <p className="text-[10px] text-gray-400 font-medium">Using env config defaults</p>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div>
              <label className="relative flex flex-col items-center justify-center w-full py-5 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/20 transition-all group">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <Loader2 size={20} className="text-primary-500 animate-spin" />
                    <span className="text-[11px] font-semibold text-gray-500">Uploading barcode…</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-center px-4">
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary-500 group-hover:bg-primary-50 transition-colors">
                      <Upload size={16} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Upload New QR Code Image</span>
                    <span className="text-[9px] text-gray-400">JPEG, PNG, WebP up to 10MB</span>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
