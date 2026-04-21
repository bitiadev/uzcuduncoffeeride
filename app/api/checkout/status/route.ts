// endpoint de recibir los datos del pago exitoso desde payway
import { getPaymentStatus } from '@/lib/payway';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // get params result from url
  const { searchParams } = new URL(request.url);
  const result = searchParams.get('result');
  console.log('Payment result:', result);

  // Consulta estado de resultado de pago si es necesario
  let status = 'pending';
  if (result) {
    const paymentStatus: any = await getPaymentStatus(result);
    if (paymentStatus.status === 'approved') status = 'approved';
    if (paymentStatus.status === 'rejected') status = 'rejected';
  }

  // redirect to checkout success page
  const redirectUrl = `${process.env.NEXT_PUBLIC_URL}/checkout/success?status=${status}`;
  return NextResponse.redirect(redirectUrl);
}