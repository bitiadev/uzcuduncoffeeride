import { NextResponse } from 'next/server';
import { getGateways } from '@/lib/queries';

export async function GET() {
  try {
    const gateways = await getGateways();
    return NextResponse.json(gateways);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching gateways' }, { status: 500 });
  }
}
