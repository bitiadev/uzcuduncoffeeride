import { NextResponse } from 'next/server';
import { createCheckoutLink } from '@/lib/payway';
import { getGatewayByMethodId } from '@/lib/queries';

export async function POST(request: Request) {
  const body = await request.json();
  const { amount, medioPagoId } = body;

  try {
    const gateway = await getGatewayByMethodId(medioPagoId);
    
    if (!gateway || !gateway.habilitada) {
      return NextResponse.json({ error: "El medio de pago seleccionado no tiene una pasarela activa." }, { status: 400 });
    }

    // Ruteo dinámico
    if (gateway.nombre === 'Payway') {
      const result: any = await createCheckoutLink({
        total_price: amount,
        products: body.products,
        shippingData: body.shippingData,
        shippingPrice: body.shippingPrice,
        success_url: `${process.env.NEXT_PUBLIC_URL}/api/checkout/status`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/products`
      });
      
      const paymentHash = result;
      return NextResponse.json({ url: `${paymentHash}`, paymentHash: paymentHash }, { status: 200});
    } else if (gateway.nombre === 'Nave') {
      return NextResponse.json({ error: "La pasarela Nave estará disponible próximamente." }, { status: 501 });
    }

    return NextResponse.json({ error: "Pasarela no soportada" }, { status: 500 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al generar link de pago" }, { status: 500 });
  }
}