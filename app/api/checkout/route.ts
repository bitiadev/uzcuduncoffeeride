import { NextResponse } from 'next/server';
import { createCheckoutLink } from '@/lib/payway';
import { createNaveCheckoutLink } from '@/lib/nave';
import { getGatewayByMethodId } from '@/lib/queries';

export async function POST(request: Request) {
  const body = await request.json();
  const { amount, medioPagoId } = body;

  try {
    const gateway = await getGatewayByMethodId(medioPagoId);

    if (!gateway || !gateway.habilitada) {
      return NextResponse.json({ error: "El medio de pago seleccionado no tiene una pasarela activa." }, { status: 400 });
    }

    console.log(`>>> Iniciando pago con Pasarela: ${gateway.nombre} (ID: ${medioPagoId})`);

    // Ruteo dinámico (insensible a mayúsculas/minúsculas)
    const gatewayNormalized = gateway.nombre.toLowerCase();

    if (gatewayNormalized === 'payway') {
      const result: any = await createCheckoutLink({
        total_price: amount,
        products: body.products,
        shippingData: body.shippingData,
        shippingPrice: body.shippingPrice,
        success_url: `${process.env.NEXT_PUBLIC_URL}/api/checkout/status`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/products`
      });

      const paymentHash = result;
      return NextResponse.json({ url: `${paymentHash}`, paymentHash: paymentHash }, { status: 200 });
    } else if (gatewayNormalized === 'nave') {
      const naveData = await createNaveCheckoutLink({
        external_payment_id: `order-${Date.now()}`,
        amount: amount,
        products: body.products,
        buyer: {
          email: body.shippingData.email,
          name: `${body.shippingData.firstName} ${body.shippingData.lastName}`,
          phone: body.shippingData.phone,
          address: {
            street: body.shippingData.address,
            city: body.shippingData.city,
            zipcode: body.shippingData.zipCode,
          }
        },
        callback_url: `${process.env.NEXT_PUBLIC_URL}/api/nave/status`,
      });

      return NextResponse.json({ url: naveData.checkout_url, paymentHash: naveData.id }, { status: 200 });
    }



    return NextResponse.json({ error: "Pasarela no soportada" }, { status: 500 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al generar link de pago" }, { status: 500 });
  }
}