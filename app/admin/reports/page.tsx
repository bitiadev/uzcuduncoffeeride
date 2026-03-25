"use client"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/ui/stats-card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { DollarSign, Package } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts"

const DEFAULT_STATUSES = ["delivered","paid","shipped"] as const

type DailyRow = { dia: string; pedidos: number; ingresos: number; delivery_total: number }
type SummaryRow = { pedidos: number; ingresos: number; delivery_total: number; ticket_promedio: number }
type CategoryRow = { categoria: string; ingresos: number; unidades: number }
type TopProductRow = { id: string; nombre: string; category: string; unidades: number; ingresos: number }

export default function ReportsPage() {
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 29*24*60*60*1000).toISOString().slice(0,10))
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0,10))
  const [statuses, setStatuses] = useState<string[]>([...DEFAULT_STATUSES])
  const [summary, setSummary] = useState<SummaryRow | null>(null)
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [topProducts, setTopProducts] = useState<TopProductRow[]>([])
  const [loading, setLoading] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("from", from)
    params.set("to", to)
    params.set("status", statuses.join(","))
    return params.toString()
  }, [from,to,statuses])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [s,d,c,tp] = await Promise.all([
        fetch(`/api/reports/summary?${query}`).then(r=>r.json()),
        fetch(`/api/reports/daily?${query}`).then(r=>r.json()),
        fetch(`/api/reports/category-revenue?${query}`).then(r=>r.json()),
        fetch(`/api/reports/top-products?${query}&limit=5`).then(r=>r.json()),
      ])
      setSummary(s)
      setDaily(d)
      setCategories(c)
      setTopProducts(tp)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ fetchAll() },[query])

  const chartConfig = { ingresos: { label: "Ingresos", color: "hsl(var(--primary))" }, pedidos: { label: "Pedidos", color: "hsl(var(--muted-foreground))" } }

  const traducir = (s: string) => ({
    delivered: "entregado",
    paid: "pagado",
    shipped: "enviado",
    pending: "pendiente",
    canceled: "cancelado",
  }[s])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reportes y Analytics</h2>
        <p className="text-muted-foreground">Analiza ventas por período, productos y categorías</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Rango de fechas y estados</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">Desde</label>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Hasta</label>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(["delivered","paid","shipped","pending","canceled"] as const).map(s => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={statuses.includes(traducir(s) ?? "")} onChange={(e)=>{
                  setStatuses(prev=> e.target.checked ? [...prev, traducir(s) ?? "" ] : prev.filter(x=>x!==traducir(s)))
                }} /> {traducir(s)}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Ingresos" value={`$${(summary?.ingresos||0).toFixed(2)}`} icon={DollarSign} />
        <StatsCard title="Pedidos" value={summary?.pedidos||0} icon={Package} />
        <StatsCard title="Ticket promedio" value={`$${(summary?.ticket_promedio||0).toFixed(2)}`} icon={DollarSign} />
        <StatsCard title="Delivery total" value={`$${(summary?.delivery_total||0).toFixed(2)}`} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rendimiento diario</CardTitle>
          <CardDescription>Ingresos y pedidos por día</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="ingresos" stroke="var(--color-ingresos)" dot={false} />
            </LineChart>
          </ChartContainer>
          <div className="mt-4">
            <ChartContainer config={chartConfig} className="h-48 w-full">
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="pedidos" fill="var(--color-pedidos)" />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por categoría</CardTitle>
            <CardDescription>Distribución de ingresos y unidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((cat)=> (
                <div key={cat.categoria} className="flex items-center gap-3">
                  <div className="w-32 text-sm">{cat.categoria}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                    <div className="h-6" style={{ width: `${Math.min(100, (cat.ingresos/(categories[0]?.ingresos||1))*100)}%`, backgroundColor: "hsl(var(--primary))" }} />
                  </div>
                  <div className="w-28 text-right text-sm">${cat.ingresos.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top productos</CardTitle>
            <CardDescription>Más vendidos por ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((p,idx)=> (
                <div key={p.id} className="grid grid-cols-6 gap-3 items-center">
                  <div className="col-span-2 truncate text-sm">{idx+1}. {p.nombre}</div>
                  <div className="text-sm">{p.category}</div>
                  <div className="text-sm">{p.unidades} uds</div>
                  <div className="col-span-2 text-right font-medium">${p.ingresos.toFixed(0)}</div>
                </div>
              ))}
              {topProducts.length===0 && !loading && (
                <div className="text-sm text-muted-foreground">Sin datos para el período seleccionado.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
