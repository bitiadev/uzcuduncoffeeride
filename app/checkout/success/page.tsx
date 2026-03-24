// En app/checkout/success/page.tsx (o similar)
"use client";

import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useCart } from "@/contexts/cart-context";
import Link from 'next/link';

export default function SuccessPage() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const status = searchParams.get('status') || 'pending';

  useEffect(() => {
    // Solo vaciamos si fue aprobado o si ya decidimos que la sesión termina aquí
    if (status === 'approved' || status === 'pending') {
      clearCart();
    }
  }, [clearCart, status]);

  const config = {
    approved: {
      title: "¡Gracias por tu compra!",
      icon: <CheckCircle className="text-green-500 w-16 h-16 mb-4" />,
      message: "Tu pedido ha sido procesado con éxito.",
      sub: "Una vez verificado el pago, comenzaremos a preparar tu pedido."
    },
    rejected: {
      title: "Pago Rechazado",
      icon: <XCircle className="text-red-500 w-16 h-16 mb-4" />,
      message: "Hubo un problema al procesar tu pago.",
      sub: "Por favor, intenta nuevamente con otro medio de pago o contactanos."
    },
    pending: {
      title: "Pedido en proceso",
      icon: <Clock className="text-amber-500 w-16 h-16 mb-4" />,
      message: "Estamos esperando la confirmación del pago.",
      sub: "Te notificaremos por email una vez que el pago sea acreditado."
    }
  }[status as 'approved' | 'rejected' | 'pending'] || {
    title: "Pedido Recibido",
    icon: <Clock className="text-amber-500 w-16 h-16 mb-4" />,
    message: "Tu pedido está siendo procesado.",
    sub: "Gracias por elegirnos."
  };

  return (
    <div className="container mt-12 mx-auto p-4 text-center max-w-lg">
      <div className="bg-white p-8 rounded-2xl shadow-sm border">
        <h1 className="text-2xl font-bold mb-6">{config.title}</h1>
        <div className="flex justify-center">
          {config.icon}
        </div>
        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">{config.message}</p>
          <p className="text-sm text-gray-400">{config.sub}</p>
          
          <div className="pt-6 border-t">
            <p className="text-sm font-medium mb-4">¿Necesitas ayuda? Contactanos por WhatsApp</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a 
                href="https://wa.me/5492235788186" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#25D366] text-white px-6 py-2 rounded-full font-medium hover:bg-[#128C7E] transition-colors w-full sm:w-auto"
              >
                Chat por WhatsApp
              </a>
              <Link 
                href="/" 
                className="inline-block bg-primary text-primary-foreground px-8 py-2 rounded-full font-medium hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-8 text-sm text-muted-foreground">¡Gracias por elegir Uzcudun Coffee Ride!</p>
    </div>
  );
}