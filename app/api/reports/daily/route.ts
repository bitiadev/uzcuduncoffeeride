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
        DATE(fecha_emision) AS dia,
        COUNT(*)::int AS pedidos,
        COALESCE(SUM(total), 0)::float AS ingresos,
        COALESCE(SUM(delivery), 0)::float AS delivery_total
      FROM pedido
      WHERE fecha_emision >= $1 AND fecha_emision < $2
        AND status = ANY($3)
        AND pago = TRUE
      GROUP BY dia
      ORDER BY dia ASC`,
      [from.toISOString(), to.toISOString(), statuses]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error reports/daily:", error);
    return new NextResponse("Error Interno del Servidor", { status: 500 });
  }
}