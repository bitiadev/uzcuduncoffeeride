import { NextResponse } from "next/server"
import { getObject } from "@/lib/object-storage"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const key = params.path.join("/")

  try {
    const { bytes, contentType } = await getObject(key)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (e: any) {
    if (e?.name === "NoSuchKey") {
      return new NextResponse(null, { status: 404 })
    }
    console.error("Error al leer imagen de storage:", key, e)
    return new NextResponse(null, { status: 500 })
  }
}
