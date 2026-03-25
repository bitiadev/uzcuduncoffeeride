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

    const { rows } = await db.query(
      `SELECT 
        r.nombre AS categoria,
        COALESCE(SUM(pp.cantidad * pp.precio), 0)::float AS ingresos,
        COALESCE(SUM(pp.cantidad), 0)::int AS unidades
      FROM pedido_productos pp
      JOIN pedido pe ON pe.id = pp.pedido_id
      JOIN producto p ON p.id = pp.producto_id
      JOIN subrubro sr ON sr.id = p.subrubro_id
      JOIN rubro r ON r.id = sr.rubro_id
      WHERE pe.fecha_emision >= $1 AND pe.fecha_emision < $2
        AND pe.status = ANY($3)
        AND pe.pago = TRUE
      GROUP BY r.nombre
      ORDER BY ingresos DESC`,
      [from.toISOString(), to.toISOString(), statuses]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reports/category-revenue:", error);
    return new NextResponse("Error Interno del Servidor", { status: 500 });
  }
}