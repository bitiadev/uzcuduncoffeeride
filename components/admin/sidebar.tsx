"use client"

import { Button } from "@/components/ui/button"
import { LayoutDashboard, Package, Shapes, ShoppingCart, BarChart3, Settings, LogOut, Bike, Users, Ruler } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { io } from "socket.io-client"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react";


// Usa localhost en dev, o NEXT_PUBLIC_SOCKET_URL si lo definiste
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const socket = io(SOCKET_URL, { transports: ["websocket"] });


const sidebarItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: Package,
  },
  {
    title: "Categorías",
    href: "/admin/categories",
    icon: Shapes,
  },
  {
    title: "Talles",
    href: "/admin/sizes",
    icon: Ruler,
  },
  {
    title: "Pedidos",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: Users,
  }, 
  {
    title: "Logística",
    href: "/admin/logistics",
    icon: Bike,
  },
  {
    title: "Reportes",
    href: "/admin/reports",
    icon: BarChart3,
  }
  /* {
    title: "Reportes",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  }, */
]

interface AdminSidebarProps {
  className?: string,
  onClose?: () => void
}

export function AdminSidebar({ className, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [cantidadPedidos, setCantidadPedidos] = useState(0);

  useEffect(() => {
    getCantidadPedidos();
  }, []);

   useEffect(() => {
      socket.on('connect', () => {
        console.log('Conectado al servidor de WebSocket');
      });
      socket.on('addPedido', () => {
        console.log('Pedido agregado, recargando lista...');
        // Volver a cargar los productos
        getCantidadPedidos();
      });
      
      socket.on('updatePedido', () => {
        console.log('Pedido actualizado, recargando cantidad...');
        getCantidadPedidos();
      }) 
      return () => {
        socket.off('addPedido');
      };
    }, []);

  const getCantidadPedidos = async () => {
    console.log("actualizando cantidad");
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      const pendientes = data.filter((order: { status: string; }) => order.status === 'pending');
      setCantidadPedidos(pendientes.length);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={cn("pb-12 w-64", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bike className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Admininistrar</h2>
          </div>
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  pathname === item.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
                onClick={onClose}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
                {item.title === "Pedidos" && cantidadPedidos > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-sm font-medium leading-none text-red-100 bg-red-600 rounded-full">
                    {cantidadPedidos}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <Button variant="ghost" className="w-full justify-start" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
