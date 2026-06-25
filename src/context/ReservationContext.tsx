import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { StoredReservation, Product } from '../types'
import { storage } from '../utils/storage'
import { apiClient } from '../services/api'

interface ReservationContextType {
  reservations: StoredReservation[]
  loading: boolean
  error: string | null
  reserve: (productId: string, quantity: number) => Promise<void>
  removeReservation: (id: string) => void
  getExpiredReservations: () => StoredReservation[]
  clearExpiredReservations: () => void
  completeCheckout: (checkoutData: Record<string, unknown>) => Promise<void>
  getReservationWithProduct: (reservation: StoredReservation, product: Product | undefined) => StoredReservation & { product?: Product }
}

const ReservationContext = createContext<ReservationContextType | undefined>(undefined)

const RESERVATION_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export function ReservationProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<StoredReservation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Initialize from localStorage */
  useEffect(() => {
    const stored = storage.getReservations()
    setReservations(stored)
  }, [])

  /* Check for expired reservations every second */
  useEffect(() => {
    const interval = setInterval(() => {
      setReservations(prev => {
        const now = Date.now()
        const active = prev.filter(r => r.expiresAt > now)
        
        if (active.length !== prev.length) {
          storage.setReservations(active)
        }
        
        return active
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const reserve = useCallback(async (productId: string, quantity: number) => {
    try {
      setError(null)
      setLoading(true)
      const response = await apiClient.createReservation(productId, quantity)
      
      const newReservation: StoredReservation = {
        id: response.id,
        productId: response.productId,
        userId: '', // Will be set from token if available
        quantity: response.quantity,
        expiresAt: response.expiresAt,
        createdAt: Date.now(),
        status: 'active',
      }

      setReservations(prev => {
        const updated = [...prev, newReservation]
        storage.setReservations(updated)
        return updated
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reserve product'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const removeReservation = useCallback((id: string) => {
    setReservations(prev => {
      const updated = prev.filter(r => r.id !== id)
      storage.setReservations(updated)
      return updated
    })
  }, [])

  const getExpiredReservations = useCallback(() => {
    const now = Date.now()
    return reservations.filter(r => r.expiresAt <= now)
  }, [reservations])

  const clearExpiredReservations = useCallback(() => {
    const expired = getExpiredReservations()
    expired.forEach(r => removeReservation(r.id))
  }, [getExpiredReservations, removeReservation])

  const completeCheckout = useCallback(async (checkoutData: Record<string, unknown>) => {
    try {
      setError(null)
      setLoading(true)
      const reservationIds = reservations.map(r => r.id)
      
      await apiClient.completeCheckout(reservationIds, checkoutData)
      
      /* Clear reservations after successful checkout */
      setReservations([])
      storage.clearReservations()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [reservations])

  const getReservationWithProduct = useCallback(
    (reservation: StoredReservation, product: Product | undefined) => ({
      ...reservation,
      product,
    }),
    []
  )

  return (
    <ReservationContext.Provider
      value={{
        reservations,
        loading,
        error,
        reserve,
        removeReservation,
        getExpiredReservations,
        clearExpiredReservations,
        completeCheckout,
        getReservationWithProduct,
      }}
    >
      {children}
    </ReservationContext.Provider>
  )
}

export function useReservations() {
  const context = useContext(ReservationContext)
  if (!context) {
    throw new Error('useReservations must be used within ReservationProvider')
  }
  return context
}
