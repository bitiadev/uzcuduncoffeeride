"use client"

import { Order } from "@/lib/types"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { CheckCircle, Clock, Package, Truck } from "lucide-react"
import { io } from "socket.io-client"

const socket = io(process.env.NEXT_PUBLIC_URL!)

export default function OrderDetailCard({ orderId }: { orderId: number }) {

  const [order, setOrder] = useState<Order>()

  useEffect(() => {
    const fetchOrder = async () => {
      const res = await fetch(`/api/orders/${orderId}`)
      const data = await res.json();
      console.log(data)
      setOrder(data)
    }
    fetchOrder()
  }, [orderId])

  return (
    <div className="p-4 bg-white">
      <div className="space-y-1">
        <p className="text-xs text-gray-400">Orden: #{order?.id}</p>
        <div className="flex items-center justify-between">
          <div className="space-x-1 flex flex-row items-center">
            <Select
              
              value={order?.status}
              disabled={!order}
              onValueChange={async (value: string) => {
                await fetch(`/api/orders/${orderId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: value })
                })
                setOrder(prev => prev ? { ...prev, status: value as "pending" | "shipped" | "delivered" | "canceled" } : undefined)
                socket.emit('updatePedido', 'Pedido actualizado')
              }}
            >
              <SelectTrigger className="w-full text-sm text-gray-700 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending"><Clock className="inline-block w-4 h-4 mr-2" /> Pendiente</SelectItem>
                <SelectItem value="shipped"><Truck className="inline-block w-4 h-4 mr-2" /> Enviado</SelectItem>
                <SelectItem value="delivered"><Package className="inline-block w-4 h-4 mr-2" /> Entregado</SelectItem>
                <SelectItem value="canceled"><CheckCircle className="inline-block w-4 h-4 mr-2" /> Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {order && (
            <p className="text-sm text-gray-700">
              <span className="font-bold">Modo de entrega:</span> {order.modo_entrega_id === 1 ? "Envío a Domicilio" : "Retiro en Tienda"}
            </p>
          )}
          <p className="text-sm text-gray-700"><span className="font-bold">Envio:</span> {order?.delivery.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
          <p className="text-sm text-gray-700"><span className="font-bold">Total:</span> {order?.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
        </div>
        {/* datos del cliente */}
        <div className="mt-4 space-y-1 flex flex-row justify-around">
          <p className="text-sm text-gray-700"><span className="font-bold">Cliente:</span> {order?.payer_name}</p>
          {order?.payer_address && <p className="text-sm text-gray-700"><span className="font-bold">Domicilio:</span> {order?.payer_address}</p>}
          <p className="text-sm text-gray-700"><span className="font-bold">Teléfono:</span> {order?.payer_phone}</p>
        </div>
      </div>
    </div>
  )
}