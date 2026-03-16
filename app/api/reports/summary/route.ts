import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function parseDateRange(url: URL) {
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const now = new Date();
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // inclusive end
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
  return ["delivered", "paid", "shipped"]; // default: pedidos completados
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const { from, to } = parseDateRange(url);
    const statuses = parseStatuses(url);

    console.log("from:", from.toISOString());
    console.log("to:", to.toISOString());
    console.log("statuses:", statuses);

    const { rows } = await db.query(
      `SELECT 
        COUNT(*)::int AS pedidos,
        COALESCE(SUM(total), 0)::float AS ingresos,
        COALESCE(SUM(delivery), 0)::float AS delivery_total,
        COALESCE(AVG(total), 0)::float AS ticket_promedio
      FROM pedido
      WHERE fecha_emision >= $1 AND fecha_emision < $2
        AND status = ANY($3)
        AND pago = TRUE`,
      [from.toISOString(), to.toISOString(), statuses]
    );

    const summary = rows[0] || { pedidos: 0, ingresos: 0, delivery_total: 0, ticket_promedio: 0 };
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error reports/summary:", error);
    return new NextResponse("Error Interno del Servidor", { status: 500 });
  }
}