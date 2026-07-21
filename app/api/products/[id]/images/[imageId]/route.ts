// app/api/products/[id]/images/[imageId]/route.ts
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import path from 'path';
import { unlink } from 'fs/promises';
import { deleteObject, parseImageKeyFromUrl } from '@/lib/object-storage';

// Helpers
function isLocalUploadUrl(url: string | null | undefined) {
  return typeof url === 'string' && url.startsWith('/uploads/');
}
function toAbsolutePathFromPublic(url: string) {
  // url: "/uploads/xxx.jpg" -> "<projectRoot>/public/uploads/xxx.jpg"
  const rel = url.replace(/^\//, ''); // remove leading slash
  return path.join(process.cwd(), 'public', rel);
}

/**
 * PATCH /api/products/:id/images/:imageId
 * Body (uno o ambos):
 *  - { is_principal: boolean }
 *  - { orden: number }
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  const productId = Number(params.id);
  const imageId = Number(params.imageId);
  if (Number.isNaN(productId) || Number.isNaN(imageId)) {
    return new NextResponse(JSON.stringify({ message: 'IDs inválidos' }), { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const { is_principal, orden } = body as { is_principal?: boolean; orden?: number };

  if (typeof is_principal === 'undefined' && typeof orden === 'undefined') {
    return new NextResponse(JSON.stringify({ message: 'Nada para actualizar' }), { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Validar que la imagen pertenezca al producto
    const exists = await client.query(
      `SELECT id FROM Producto_Imagen WHERE id = $1 AND producto_id = $2`,
      [imageId, productId]
    );
    if (exists.rowCount === 0) {
      await client.query('ROLLBACK');
      return new NextResponse(JSON.stringify({ message: 'Imagen no encontrada' }), { status: 404 });
    }

    if (typeof is_principal !== 'undefined') {
      await client.query(
        `UPDATE Producto_Imagen SET is_principal = $1 WHERE id = $2`,
        [!!is_principal, imageId]
      );
    }

    if (typeof orden !== 'undefined') {
      const imgsRes = await client.query(
        `SELECT id FROM Producto_Imagen
         WHERE producto_id = $1 AND id <> $2
         ORDER BY orden ASC`,
        [productId, imageId]
      );

      const others = imgsRes.rows.map((r: any) => r.id);
      const targetIndex = Math.max(0, Math.min(Number(orden) - 1, others.length));
      others.splice(targetIndex, 0, imageId);

      for (let i = 0; i < others.length; i++) {
        await client.query(
          `UPDATE Producto_Imagen SET orden = $1 WHERE id = $2`,
          [i + 1, others[i]]
        );
      }
    }

    await client.query('COMMIT');
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error al actualizar imagen:', e);
    return new NextResponse(JSON.stringify({ message: 'Error al actualizar imagen' }), { status: 500 });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/products/:id/images/:imageId
 * Elimina la imagen de DB y, si la URL es local (/uploads/*), elimina también el archivo físico.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  const productId = Number(params.id);
  const imageId = Number(params.imageId);
  if (Number.isNaN(productId) || Number.isNaN(imageId)) {
    return new NextResponse(JSON.stringify({ message: 'IDs inválidos' }), { status: 400 });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1) Obtener la URL antes de borrar
    const imgRes = await client.query(
      `SELECT url FROM Producto_Imagen WHERE id = $1 AND producto_id = $2`,
      [imageId, productId]
    );
    if (imgRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return new NextResponse(JSON.stringify({ message: 'Imagen no encontrada' }), { status: 404 });
    }
    const url: string = imgRes.rows[0].url;

    // 2) Borrar fila (los triggers se encargan de portada/principal)
    await client.query(
      `DELETE FROM Producto_Imagen WHERE id = $1 AND producto_id = $2`,
      [imageId, productId]
    );

    await client.query('COMMIT');

    // 3) Intentar borrar archivo físico si es local; si es de object storage, borrar la key
    if (isLocalUploadUrl(url)) {
      const filePath = toAbsolutePathFromPublic(url);
      try {
        await unlink(filePath);
      } catch (e: any) {
        // Si no existe o falla, log y seguimos (no rompemos la API por el archivo)
        if (e?.code !== 'ENOENT') {
          console.warn('No se pudo eliminar el archivo:', filePath, e);
        }
      }
    } else {
      const key = parseImageKeyFromUrl(url);
      if (key) {
        try {
          await deleteObject(key);
        } catch (e) {
          console.warn('No se pudo eliminar el objeto en storage:', key, e);
        }
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error al borrar imagen:', e);
    return new NextResponse(JSON.stringify({ message: 'Error al borrar imagen' }), { status: 500 });
  } finally {
    client.release();
  }
}
