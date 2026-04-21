/* import { NextResponse } from 'next/server';
import { paywayClient } from '@/lib/payway';

export async function POST(request: Request) {
  const notification = await request.json();
  console.log("Notificación de Payway:", notification);
  // Consultar el estado real del pago para mayor seguridad [14]
  paywayClient.paymentInfo(notification.id, (result: any, err: any) => {
    if (result && result.status === 'approved') {
      // AQUÍ: Lógica para actualizar el pedido en tu BD PostgreSQL [15]
      console.log("Pago aprobado para el ID:", result.id);
    }
  });

  return NextResponse.json({ status: "received" });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  console.log(`Notificación GET de Payway - ID: ${id}, Estado: ${status}`);
  return NextResponse.json({ status: "received" });
} */

import { NextResponse } from 'next/server';
import { getPaymentStatus } from '@/lib/payway';
import { db } from '@/lib/db';

export async function POST(request: Request) {

  try {
    const notification = await request.json();

    console.log('Webhook Payway:', notification);

    const paymentHash =
      notification.hash ||
      notification.payment_hash ||
      notification.site_transaction_id;

    if (!paymentHash) {
      console.warn('Webhook sin identificador');
      return NextResponse.json({ ok: true });
    }

    const payment: any = await getPaymentStatus(paymentHash);


    if (payment.status === 'approved') {

      console.log('✅ Pago aprobado:', payment.site_transaction_id);
      // Actualizamos la orden en DB
      await db.query(
        'UPDATE pedido SET pago = $1, status = $2 WHERE payment_hash = $3',
        [true, 'paid', paymentHash]
      );
    }

    if (payment.status === 'rejected') {
      console.log('❌ Pago rechazado');
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error webhook Payway:', error);
    return NextResponse.json({ ok: true });
  }
}