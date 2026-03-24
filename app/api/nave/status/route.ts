import { getNavePaymentStatus } from '@/lib/nave';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Endpoint para recibir la redirección del cliente desde el checkout de Nave.
 * Nave redirige aquí al finalizar el pago (aprobado, rechazado o cancelado).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Nave suele enviar el payment_request_id o datos del pago en la URL de callback
  const paymentRequestId = searchParams.get('payment_request_id');
  const externalId = searchParams.get('external_payment_id');
  
  console.log('Cliente regresó de Nave. ID de solicitud:', paymentRequestId, 'ID Externo:', externalId);

  // Aunque las notificaciones vía Webhook son las encargadas de actualizar la DB de forma segura,
  // aquí podríamos verificar el estado para dar feedback inmediato si fuera necesario.
  
  // Redirigimos siempre a la página de éxito del checkout. 
  // La UI de éxito se encargará de mostrar el estado final consultando la orden.
  const redirectUrl = `${process.env.NEXT_PUBLIC_URL}/checkout/success`;
  
  return NextResponse.redirect(redirectUrl);
}
