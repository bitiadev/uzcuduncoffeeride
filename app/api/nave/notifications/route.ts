import { getNavePaymentStatus } from '@/lib/nave';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Notificación de Nave recibida:', body);

    const { payment_id, external_payment_id } = body;

    if (payment_id) {
      // Consultamos el detalle del pago para verificar el estado real
      const paymentData = await getNavePaymentStatus(payment_id);
      console.log('Detalles del pago en Nave:', paymentData);

      if (paymentData.status && paymentData.status.name === 'APPROVED') {
        const orderId = external_payment_id.replace('order-', '');
        
        // Actualizamos el pedido en la base de datos (marcar como pagado)
        await db.query(
          'UPDATE pedido SET pago = $1, status = $2 WHERE payment_hash = $3 OR id = $4',
          [true, 'paid', paymentData.payment_request_id, isNaN(Number(orderId)) ? -1 : Number(orderId)]
        );

        // Emitir evento para actualizar el dashboard en tiempo real
        if ((global as any).io) {
          (global as any).io.emit('updatePedido', { id: orderId, status: 'paid' });
          console.log('Evento updatePedido emitido (Nave)');
        }
        
        console.log(`Orden ${external_payment_id} marcada como PAGADA vía Webhook de Nave`);
      } else if (paymentData.status && (paymentData.status.name === 'REJECTED' || paymentData.status.name === 'EXPIRED')) {
        const orderId = external_payment_id.replace('order-', '');
        await db.query(
          'UPDATE pedido SET status = $1 WHERE payment_hash = $2 OR id = $3',
          ['rejected', paymentData.payment_request_id, isNaN(Number(orderId)) ? -1 : Number(orderId)]
        );

        if ((global as any).io) {
          (global as any).io.emit('updatePedido', { id: orderId, status: 'rejected' });
        }
        console.log(`Orden ${external_payment_id} marcada como RECHAZADA vía Webhook de Nave`);
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Error en el manejador de notificaciones de Nave:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

