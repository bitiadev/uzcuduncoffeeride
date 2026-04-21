import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function parseDateRange(url: URL) {
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const now = new Date();
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const from = fromParam ? new Date(fromParam) : defaultFrom;
  const to = toParam ? new Date(toParam) : defaultTo;
  return { from, to };
}

function parseStatuses(url: URL) {
  const statusParam = url.searchParams.get("status");
  if (statusParam) {
    const parts = statusParam.split(",").map(s => s.trim()).filter(Boolean);
    return parts.length ? parts : ["delivered", "paid", "shipped"]; // fallback if empty
  }
  return ["delivered", "paid", "shipped"]; // default completados
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { from, to } = parseDateRange(url);
    const statuses = parseStatuses(url);
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);

    const { rows } = await db.query(
      `SELECT 
        p.id,
        p.nombre,
        sr.nombre AS category,
        COALESCE(SUM(pp.cantidad), 0)::int AS unidades,
        COALESCE(SUM(pp.cantidad * pp.precio), 0)::float AS ingresos
      FROM pedido_productos pp
      JOIN pedido pe ON pe.id = pp.pedido_id
      JOIN producto p ON p.id = pp.producto_id
      JOIN subrubro sr ON sr.id = p.subrubro_id
      WHERE pe.fecha_emision >= $1 AND pe.fecha_emision < $2
        AND pe.status = ANY($3)
        AND pe.pago = TRUE
      GROUP BY p.id, p.nombre, sr.nombre
      ORDER BY ingresos DESC
      LIMIT $4`,
      [from.toISOString(), to.toISOString(), statuses, limit]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reports/top-products:", error);
    return new NextResponse("Error Interno del Servidor", { status: 500 });
  }
}