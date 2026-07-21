// RUTA TEMPORAL de un solo uso para migrar imágenes de Supabase Storage / disco
// local a MinIO. Se elimina apenas se confirma la migración (ver utils/migrate-images-to-minio.js
// para la versión de referencia pensada para correr fuera de la app).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { uploadObject, imageUrlFor } from "@/lib/object-storage"
import { readFile } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
}

function classifyUrl(url: string) {
  const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (supabaseMatch) return { type: "supabase" as const, key: supabaseMatch[2] }
  if (url.startsWith("/uploads/")) {
    const filename = url.slice("/uploads/".length)
    return { type: "local" as const, filename, key: `uploads/${filename}` }
  }
  if (url.startsWith("/api/images/")) return { type: "already-migrated" as const }
  return { type: "unknown" as const }
}

async function fetchSupabaseObject(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} devolvió ${res.status}`)
  const contentType = res.headers.get("content-type") || "application/octet-stream"
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, contentType }
}

async function readLocalObject(filename: string) {
  const filePath = path.join(process.cwd(), "public", "uploads", filename)
  const buffer = await readFile(filePath)
  const ext = path.extname(filename).toLowerCase()
  return { buffer, contentType: MIME_BY_EXT[ext] || "application/octet-stream" }
}

function checkAuth(req: Request) {
  const secret = process.env.MIGRATION_SECRET
  return !!secret && req.headers.get("x-migration-secret") === secret
}

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return new NextResponse(null, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const dryRun = !!body.dryRun
  const restoreRows = body.restore as { id: number; url: string }[] | undefined

  if (restoreRows) {
    let restored = 0
    for (const row of restoreRows) {
      await db.query("UPDATE Producto_Imagen SET url = $1 WHERE id = $2", [row.url, row.id])
      restored++
    }
    return NextResponse.json({ restored })
  }

  const { rows } = await db.query("SELECT id, url FROM Producto_Imagen ORDER BY id")

  const counts: Record<string, number> = {}
  const backup: { id: number; url: string }[] = []
  const results: any[] = []
  const failures: any[] = []

  for (const row of rows) {
    if (typeof row.url !== "string" || row.url.length === 0) {
      counts.unknown = (counts.unknown || 0) + 1
      continue
    }
    const classification = classifyUrl(row.url)
    counts[classification.type] = (counts[classification.type] || 0) + 1

    if (classification.type === "already-migrated" || classification.type === "unknown") continue

    if (dryRun) {
      results.push({ id: row.id, type: classification.type, key: classification.key })
      continue
    }

    try {
      const { buffer, contentType } =
        classification.type === "supabase"
          ? await fetchSupabaseObject(row.url)
          : await readLocalObject(classification.filename)

      backup.push({ id: row.id, url: row.url })

      await uploadObject(classification.key, buffer, contentType)
      const newUrl = imageUrlFor(classification.key)
      await db.query("UPDATE Producto_Imagen SET url = $1 WHERE id = $2", [newUrl, row.id])
      results.push({ id: row.id, oldUrl: row.url, newUrl, status: "ok" })
    } catch (e: any) {
      failures.push({ id: row.id, url: row.url, error: e.message })
    }
  }

  return NextResponse.json({ dryRun, counts, results, failures, backup })
}
