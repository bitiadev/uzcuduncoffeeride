// app/api/products/[id]/images/upload/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import path from "path"
import { uploadObject, imageUrlFor } from "@/lib/object-storage"

export const runtime = "nodejs" // necesitamos fs

const MAX_FILES = 12;          // tope por request
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB por archivo
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const productId = Number(params.id);
    if (Number.isNaN(productId)) {
      return new NextResponse(JSON.stringify({ message: "ID inválido" }), { status: 400 });
    }

    const form = await req.formData();
    const files = form.getAll("files") as File[];
    if (!files || files.length === 0) {
      return new NextResponse(JSON.stringify({ message: "No se recibieron archivos" }), { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return new NextResponse(JSON.stringify({ message: `Máximo ${MAX_FILES} archivos por subida` }), { status: 400 });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const saved: { id: number; url: string; orden: number; is_principal: boolean }[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.has(file.type)) {
          throw new Error(`Tipo no permitido: ${file.type}`);
        }
        if (file.size > MAX_SIZE_BYTES) {
          throw new Error(`Archivo supera ${MAX_SIZE_BYTES / (1024 * 1024)}MB: ${file.name}`);
        }

        // Nombre seguro único
        const ext = path.extname(file.name || "").toLowerCase() || guessExt(file.type);
        const base = (file.name || "image").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40);
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}${ext}`;
        const storagePath = `products/${productId}/${filename}`;

        // Subir a MinIO (bucket 'images')
        const buffer = Buffer.from(await file.arrayBuffer());
        await uploadObject(storagePath, buffer, file.type);
        const publicUrl = imageUrlFor(storagePath);

        // Insertar en DB con orden al final
        const insert = await client.query(
          `
          INSERT INTO Producto_Imagen (producto_id, url, orden)
          VALUES ($1, $2, (
            SELECT COALESCE(MAX(orden) + 1, 1) FROM Producto_Imagen WHERE producto_id = $1
          ))
          RETURNING id, url, orden, is_principal
        `,
          [productId, publicUrl]
        );

        saved.push(insert.rows[0]);
      }

      await client.query("COMMIT");
      return NextResponse.json({ images: saved }, { status: 201 });
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Error al subir/insertar imágenes:", e);
      return new NextResponse(JSON.stringify({ message: "Error al guardar imágenes" }), { status: 500 });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error(e);
    return new NextResponse(JSON.stringify({ message: e.message || "Error al procesar subida" }), { status: 500 });
  }
}

function guessExt(mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/avif") return ".avif";
  if (mime === "image/gif") return ".gif";
  return "";
}