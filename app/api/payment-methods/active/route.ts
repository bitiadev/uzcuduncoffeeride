import { NextResponse } from 'next/server';
import { getActivePaymentMethods } from '@/lib/queries';

export async function GET() {
  try {
    const methods = await getActivePaymentMethods();
    return NextResponse.json(methods);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching active payment methods' }, { status: 500 });
  }
}
