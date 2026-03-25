"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Package, Truck, CheckCircle, Clock, X, Printer, DollarSign, Link2 } from "lucide-react"
import { Order } from "@/lib/types"
import { toast } from "sonner"
import { io } from "socket.io-client";
import Link from "next/link"
import store from "@/lib/data" // datos del remitente (nombre, direccion, cuit, etc.)

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== "undefined" ? window.location.origin : "");
const socket = io(SOCKET_URL, { transports: ["websocket"] });

const statusConfig = {
  pending: { label: "Pendiente", variant: "outline" as const, icon: Clock },
  delivered: { label: "Entregado", variant: "secondary" as const, icon: Package },
  shipped: { label: "Enviado", variant: "default" as const, icon: Truck },
  canceled: { label: "Cancelado", variant: "default" as const, icon: CheckCircle },
  paid: { label: "Pagado", variant: "success" as const, icon: DollarSign },
  rejected: { label: "Rechazado", variant: "destructive" as const, icon: X },
}

/** Construye el HTML de la etiqueta para imprimir en un iframe oculto */
function buildLabelHTML(order: Order) {
  const fecha = new Date(order.fecha_emision).toLocaleString();

  // Remitente (desde lib/data.ts)
  const remitente = {
    nombre: (store as any)?.nombre ?? "",
    direccion: (store as any)?.direccion ?? "",
    ciudad: (store as any)?.ciudad ?? "",
    provincia: (store as any)?.provincia ?? "",
    codigo_postal: (store as any)?.codigo_postal ?? "",
    telefono: (store as any)?.telefono ?? "",
    cuit: (store as any)?.cuit ?? "",
  };

  // Destinatario
  const destNombre = order.payer_name || "";
  const destDir = order.payer_address || "";
  const destCP = order.payer_zip || "";

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Etiqueta Pedido ${order.id}</title>
      <style>
        @page { size: 100mm 150mm; margin: 0; }
        html, body { margin: 0; padding: 0; }
        body { background: #fff; }
        .label {
          box-sizing: border-box;
          width: 100mm; height: 150mm;
          padding: 8mm;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #000;
        }
        .row { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
        .muted { color:#444; font-size:11px; }
        .big { font-size:22px; font-weight:800; letter-spacing:1px; }
        .cp {
          font-size:28px; font-weight:900; letter-spacing:2px;
          border:2px solid #000; padding:4px 8px; display:inline-block;
        }
        .cut-marks:before, .cut-marks:after {
          content:""; position:absolute; left:0; right:0; height:0; border-top:1px dashed #aaa;
        }
        .cut-marks:before{ top:0; } .cut-marks:after{ bottom:0; }
        .qr {
          width: 40mm; height: 40mm;
          border:1px solid #000;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; font-weight:700;
          margin-left:auto;
        }
        .sep { margin:8px 0; border-top:2px solid #000 }
        .footer { margin-top: 6mm; display:flex; justify-content:space-between; font-size:11px; }
      </style>
    </head>
    <body>
      <div class="label cut-marks">
        <div class="row">
          <div>
            <div style="font-weight:700; font-size:14px;">${remitente.nombre}</div>
            <div class="muted">${remitente.direccion}</div>
            <div class="muted">${remitente.ciudad}, ${remitente.provincia} (${remitente.codigo_postal})</div>
            ${remitente.telefono ? `<div class="muted">Tel: ${remitente.telefono}</div>` : ""}
            ${remitente.cuit ? `<div class="muted">CUIT: ${remitente.cuit}</div>` : ""}
          </div>
          <div class="qr">QR/BARCODE<br/>(pendiente)</div>
        </div>

        <div class="sep"></div>

        <div>
          <div class="muted">Destinatario</div>
          <div class="big">${destNombre}</div>
          <div style="margin-top:2px;">${destDir}</div>
          ${destCP ? `<div style="margin-top:6px;"><span class="cp">${destCP}</span></div>` : ""}
        </div>

        <div class="footer">
          <div>Pedido: #${order.id}</div>
          <div>${fecha}</div>
        </div>
      </div>
      <script>
        window.onload = () => { window.focus(); window.print(); };
      </script>
    </body>
  </html>`;
}

/** Inyecta un iframe oculto y manda a imprimir SOLO la etiqueta */
async function printOrderLabel(order: Order) {
  const html = buildLabelHTML(order);

  // Crear iframe oculto
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  // Escribir el HTML y dejar que el onload interno del documento dispare print()
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  // Remover el iframe un rato después de imprimir (sin forzar doble impresión)
  setTimeout(() => {
    try {
      document.body.removeChild(iframe);
    } catch { }
  }, 1500);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("pending");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])

  useEffect(() => {
    fetchOrders()
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await fetch("/api/orders").then((res) => res.json())
      setLoading(false);
      setOrders(data);
      setFilteredOrders(data);
    }
    catch (error) {
      console.error(error);
    }
  }


  useEffect(() => {
    socket.on('connect', () => {
      console.log('Conectado al servidor de WebSocket');
    });
    socket.on('addPedido', () => {
      setLoading(true);
      console.log('Pedido nuevo, recargando lista...');
      getPedidos();
    });
    socket.on('updatePedido', () => {
      setLoading(true);
      console.log('Pedido actualizado, recargando lista...');
      getPedidos();
    });
    return () => { 
      socket.off('addPedido'); 
      socket.off('updatePedido');
    };
  }, []);

  const getPedidos = async () => {
    try {
      const data = await fetch("/api/orders").then((res) => res.json())
      setLoading(false);
      setOrders(data);
      setFilteredOrders(data);
    }
    catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    let filtered = [...orders]
    if (statusFilter === "shipped" || statusFilter === "delivered") {
      filtered = filtered.filter((order) => order.status === "shipped" || order.status === "delivered")
    } else if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (order) =>
          order.id.toString().includes(searchTerm) ||
          order.payer_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    setFilteredOrders(filtered)
  }, [statusFilter, searchTerm, orders])

  if (loading) {
    return <div>Cargando pedidos...</div>
  }

  const updateOrderStatus = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
    if (res.status === 200) {
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? { ...order, status: newStatus }
            : order
        )
      );
      socket.emit('updatePedido', 'Pedido actualizado');
    } else {
      toast.error("Ha ocurrido un error al actualizar el pedido");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pedidos</h2>
        <p className="text-muted-foreground">Gestiona todos los pedidos de tu tienda de motocicletas y cafetería</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className={`cursor-pointer ${statusFilter === "all" ? "bg-[#F5F5F5] shadow-xl" : ""}`} onClick={() => setStatusFilter("all")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "pending" ? "bg-[#F5F5F5] shadow-xl" : ""}`} onClick={() => setStatusFilter("pending")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o) => o.status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "paid" ? "bg-[#F5F5F5] shadow-xl" : ""}`} onClick={() => setStatusFilter("paid")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o) => o.status === "paid").length}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "shipped" || statusFilter === "delivered" ? "bg-[#F5F5F5] shadow-xl" : ""}`} onClick={() => setStatusFilter("shipped")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <div className="flex space-x-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Truck className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o) => o.status === "shipped" || o.status === "delivered").length}</div>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer ${statusFilter === "canceled" ? "bg-[#F5F5F5] shadow-xl" : ""}`} onClick={() => setStatusFilter("canceled")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.filter((o) => o.status === "canceled").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, cliente"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            {/* Select de estados si lo querés reactivar más adelante */}
          </div>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card>
        <CardHeader className="flex items-center space-x-4 justify-between">
          <div className="space-y-2">
            <CardTitle>Lista de Pedidos ({filteredOrders.length})</CardTitle>
            <CardDescription>Gestiona el estado y detalles de todos los pedidos</CardDescription>
          </div>
          <Link href={process.env.NEXT_PUBLIC_PAYWAY_PORTAL!} target="_blank" rel="noopener noreferrer">
            <Button className="ml-auto cursor-pointer">
              <Link2 className="w-4 h-4 mr-2" />
              Corroborar pagos
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Modo Entrega</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const statusInfo = statusConfig[order.status as keyof typeof statusConfig]
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.id}</div>
                        <div className="text-sm text-muted-foreground">{order.pago}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.payer_name}</div>
                        <div className="text-sm text-muted-foreground max-w-[200px] overflow-hidden whitespace-nowrap text-ellipsis">{order.payer_address}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${order.total.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      {order.modo_entrega_id === 1 ? (
                        <div className="flex items-center space-x-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span>Envío a Domicilio</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <span>Retiro en Tienda</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={order.status} 
                        onValueChange={(value) => updateOrderStatus(order.id, value as Order["status"])}
                        disabled={order.status === "canceled"}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue>
                            <div className="flex items-center space-x-2">
                              <statusInfo.icon className="w-3 h-3" />
                              <span>{statusInfo.label}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3 h-3" />
                              <span>Pendiente</span>
                            </div>
                          </SelectItem>

                          <SelectItem value="paid">
                            <div className="flex items-center space-x-2">
                              <DollarSign className="w-3 h-3" />
                              <span>Pagado</span>
                            </div>
                          </SelectItem>

                          <SelectItem value="delivered">
                            <div className="flex items-center space-x-2">
                              <Truck className="w-3 h-3" />
                              <span>Entregado</span>
                            </div>
                          </SelectItem>

                          <SelectItem value="shipped">
                            <div className="flex items-center space-x-2">
                              <Package className="w-3 h-3" />
                              <span>Enviado</span>
                            </div>
                          </SelectItem>

                          <SelectItem value="canceled">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="w-3 h-3" />
                              <span>Cancelado</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(order.fecha_emision).toLocaleString("es-AR", { timeZone: "America/Buenos_Aires", dateStyle: "short", timeStyle: "short" })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="default"
                          className="cursor-pointer bg-green-800 text-white hover:bg-green-900"
                          title="Marcar como pagado"
                          style={{ display: order.status === "paid" || order.status === "canceled" ? "none" : "inline-flex" }}
                          onClick={() => updateOrderStatus(order.id, "paid")}
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>pagado</span>
                        </Button>
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 cursor-pointer"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {order.modo_entrega_id === 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 cursor-pointer"
                            title="Imprimir etiqueta"
                            onClick={() => printOrderLabel(order)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


