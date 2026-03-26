"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Pencil, Check, X } from "lucide-react"
import type { Gateway, ActivePaymentMethod as PaymentMethod } from "@/lib/types"

export default function PaymentMethodsPage() {
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [gRes, mRes] = await Promise.all([
        fetch('/api/admin/payment/gateways'),
        fetch('/api/admin/payment/methods')
      ])
      const gData = await gRes.json()
      const mData = await mRes.json()
      setGateways(gData)
      setMethods(mData)
    } catch (error) {
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleGateway = async (id: number, habilitada: boolean) => {
    try {
      const res = await fetch(`/api/admin/payment/gateways/${id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habilitada })
      })
      if (res.ok) {
        toast.success(`Pasarela ${habilitada ? 'habilitada' : 'deshabilitada'}`)
        fetchData() // Recargar para ver cambios en cascada
      } else {
        throw new Error()
      }
    } catch (error) {
      toast.error("Error al actualizar pasarela")
    }
  }

  const handleAssignGateway = async (methodId: number, gatewayId: string) => {
    try {
      const res = await fetch(`/api/admin/payment/methods/${methodId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId: gatewayId === "none" ? null : gatewayId })
      })
      if (res.ok) {
        toast.success("Asignación actualizada")
        fetchData()
      } else {
        throw new Error()
      }
    } catch (error) {
      toast.error("Error al asignar pasarela")
    }
  }

  const handleUpdateBadge = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/payment/methods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_texto: editValue })
      })
      if (res.ok) {
        toast.success("Promoción actualizada")
        setEditingId(null)
        fetchData()
      } else {
        throw new Error()
      }
    } catch (error) {
      toast.error("Error al actualizar promoción")
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración de Medios de Pago</h2>
        <p className="text-muted-foreground">Configura qué pasarela procesa cada medio de pago.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pasarelas */}
        <Card>
          <CardHeader>
            <CardTitle>Pasarelas de Pago</CardTitle>
            <CardDescription>Habilita o deshabilita las plataformas de pago disponibles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.nombre}</TableCell>
                    <TableCell className="text-right">
                      <Switch 
                        checked={g.habilitada} 
                        onCheckedChange={(checked) => handleToggleGateway(g.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Medios de Pago */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Asignación de Medios de Pago</CardTitle>
            <CardDescription>Vincula cada tarjeta o medio a una pasarela activa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medio de Pago</TableHead>
                  <TableHead>Promoción</TableHead>
                  <TableHead>Pasarela Asignada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded border p-1 bg-white">
                           <Image 
                            src={m.logo_url || "/placeholder.svg"} 
                            alt={m.nombre} 
                            fill 
                            className="object-contain"
                          />
                        </div>
                        <span className="font-medium">{m.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === m.id ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 w-[150px]"
                            placeholder="Ej: 3 cuotas"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdateBadge(m.id)}>
                            <Check className="h-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setEditingId(null)}>
                            <X className="h-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          {m.badge_texto ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">{m.badge_texto}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Sin promo</span>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingId(m.id)
                              setEditValue(m.badge_texto || "")
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={m.pasarela_id?.toString() || "none"} 
                        onValueChange={(val) => handleAssignGateway(m.id, val)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin pasarela asignada</SelectItem>
                          {gateways.filter(g => g.habilitada).map((g) => (
                            <SelectItem key={g.id} value={g.id.toString()}>
                              {g.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Verificación de Filtro de Medios de Pago
He revisado la implementación del ruteador de pagos para verificar que los clientes solo vean medios de pago activos
y con pasarela asignada.

1. Comportamiento al deshabilitar una Pasarela
En el archivo lib/queries.ts, la función toggleGateway maneja la deshabilitación de forma robusta:

Si se deshabilita una pasarela (habilitada = false), se ejecuta un UPDATE automático que pone en NULL el campo pasarela_id 
de todos los medios de pago asociados. Esto asegura que esos medios de pago queden "sin plataforma asignada" inmediatamente.

2. Filtrado en el Checkout
La función que lista los medios de pago para el cliente es getActivePaymentMethods en lib/queries.ts:
Utiliza un JOIN (Inner Join) con la tabla pasarela. Esto excluye automáticamente cualquier medio de pago que tenga
pasarela_id = NULL. Además, incluye la condición WHERE p.habilitada = TRUE, lo que garantiza que si por alguna razón 
un medio tiene asignada una pasarela deshabilitada, tampoco se muestre.

3. Actualización Automática
El componente PaymentSelector en el checkout consulta la API /api/payment-methods/active cada vez que se carga.
Las consultas a la base de datos utilizan unstable_noStore(), lo que evita el cacheo de Next.js y asegura que el cliente 
siempre vea la configuración más reciente del administrador.

Conclusión
El flujo es correcto y la actualización es automática. Si el comercio deshabilita una pasarela,
los medios de pago vinculados desaparecerán del checkout para el próximo cliente que intente pagar
(o si el cliente actual refresca la lista).

NOTA: Al volver a habilitar una pasarela, el administrador deberá re-asignar los medios de pago manualmente,
ya que la deshabilitación previa borró la vinculación.
 */