import { useEffect, useMemo } from 'react'
import {Link, useSearchParams } from 'react-router-dom'
import { useReservations } from '../context/ReservationContext'

const PENDING_PAYMENT_KEY = 'invertra_pending_payment'

type PendingPayment = {
  reference?: string
  reservationId?: string
  amount?: number
}

function getPendingPayment(): PendingPayment | null {
  try {
    const stored = sessionStorage.getItem(PENDING_PAYMENT_KEY)
    return stored ? (JSON.parse(stored) as PendingPayment) : null
  } catch {
    return null
  }
}

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const { reservations, removeReservation } = useReservations()

  const pendingPayment = useMemo(getPendingPayment, [])
  const reference =
    searchParams.get('reference') ||
    searchParams.get('trxref') ||
    pendingPayment?.reference ||
    ''

  useEffect(() => {
    if (!reference) {
      return
    }

    reservations.forEach(reservation => removeReservation(reservation.id))
    sessionStorage.removeItem(PENDING_PAYMENT_KEY)
  }, [reference, reservations, removeReservation])

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container-max">
        <div className="card max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/40">
            <span className="text-primary text-xl font-bold">PAID</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">Payment Successful</h1>
          <p className="text-muted mb-8">
            Thank you for your order. Your reservation payment has been received and your items are being processed.
          </p>

          {reference && (
            <div className="bg-background border border-border rounded-lg p-4 mb-8 text-left">
              <p className="text-sm text-muted mb-1">Payment reference</p>
              <p className="font-semibold break-all">{reference}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="btn-primary">
              Continue Shopping
            </Link>
            <Link to="/checkout" className="btn-secondary">
              View Cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
