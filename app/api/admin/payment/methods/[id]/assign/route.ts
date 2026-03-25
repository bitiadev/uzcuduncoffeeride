import { NextResponse } from 'next/server';
import { assignGatewayToMethod } from '@/lib/queries';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { gatewayId } = body; // Can be null
    const methodId = parseInt(params.id);
    
    const success = await assignGatewayToMethod(methodId, gatewayId ? parseInt(gatewayId) : null);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to assign gateway' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
