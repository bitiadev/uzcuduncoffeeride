import { NextResponse } from 'next/server';
import { toggleGateway } from '@/lib/queries';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { habilitada } = body;
    const id = parseInt(params.id);
    
    const success = await toggleGateway(id, habilitada);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to toggle gateway' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
