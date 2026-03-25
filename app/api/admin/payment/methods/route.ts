import { NextResponse } from 'next/server';
import { getPaymentMethods } from '@/lib/queries';

export async function GET() {
  try {
    const methods = await getPaymentMethods();
    return NextResponse.json(methods);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching payment methods' }, { status: 500 });
  }
}
