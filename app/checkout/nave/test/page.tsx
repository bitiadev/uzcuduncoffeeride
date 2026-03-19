// En app/checkout/success/page.tsx (o similar)
"use client";

import { CheckCircle } from 'lucide-react';
//import io from 'socket.io-client';
//import { toast } from "@/hooks/use-toast";
//const socket = io(process.env.NEXT_PUBLIC_URL!);

export default function SuccessPage() {

    return (
        <div className="container mt-4 mx-auto p-4 text-center">
            <h1 className="text-2xl font-bold mb-4">¡Gracias por tu compra!</h1>
            <div className="flex justify-center">
                <CheckCircle className="text-green-500 w-16 h-16 mb-4" />
            </div>
            <p className="mb-2">Tu pedido ha sido procesado con éxito.</p>
            <p className="mb-2">Una vez verificado el pago, comenzaremos a preparar tu pedido.</p>
            <p className="mt-4">Nos pondremos en contacto contigo a la brevedad.</p>
            <p className="mt-4">¡Gracias por elegir Uzcudun Coffee Ride!</p>
            <div className="mt-6">
                <a href="/" className="text-blue-500 hover:underline">Volver al inicio</a>
            </div>
        </div>

    );
}