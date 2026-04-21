import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { badge_texto } = await request.json();

    await db.query(
      'UPDATE mediopago SET badge_texto = $1 WHERE id = $2',
      [badge_texto || null, id]
    );

    return NextResponse.json({ message: "Medio de pago actualizado" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error al actualizar medio de pago" }, { status: 500 });
  }
}
