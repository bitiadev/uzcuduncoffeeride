"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import type { ActivePaymentMethod } from "@/lib/types"

interface PaymentSelectorProps {
  onSelect: (method: ActivePaymentMethod) => void
  selectedId?: number
}

export function PaymentSelector({ onSelect, selectedId }: PaymentSelectorProps) {
  const [methods, setMethods] = useState<ActivePaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActiveMethods = async () => {
      try {
        const res = await fetch('/api/payment-methods/active')
        if (res.ok) {
          const data = await res.json()
          setMethods(data)
        }
      } catch (error) {
        console.error("Error fetching payment methods:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchActiveMethods()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (methods.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 text-center">
        <p className="text-sm text-muted-foreground">No hay medios de pago configurados en este momento.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold mb-4">Seleccioná tu medio de pago</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {methods.map((method) => (
          <Card 
            key={method.id}
            className={cn(
              "relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg overflow-hidden",
              selectedId === method.id ? "border-primary ring-2 ring-primary bg-primary/5" : "border-border"
            )}
            onClick={() => onSelect(method)}
          >
            <CardContent className="p-6 flex items-center gap-6">
              <div className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg border p-2 border-gray-100 flex items-center justify-center shadow-sm">
                <Image 
                  src={method.logo_url || "/placeholder.svg"} 
                  alt={method.nombre} 
                  fill
                  className="p-1 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg leading-tight mb-2">{method.nombre}</p>
                {method.badge_texto && (
                  <Badge variant="secondary" className="text-xs py-1 px-3 font-bold bg-green-100 text-green-700 border-green-200">
                    {method.badge_texto}
                  </Badge>
                )}
              </div>
              {selectedId === method.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
