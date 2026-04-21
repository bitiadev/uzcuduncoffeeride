import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { rows } = await db.query('SELECT * FROM pedido ORDER BY fecha_emision DESC');
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: "Error fetching orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { 
      pago,
      modo_entrega_id,
      total,
      delivery,
      payer_name,
      payer_address,
      payer_phone,
      payer_zip,
      products,
      paymentHash,
      medio_pago_id,
    } = await req.json();
    // console.log(pago, modo_entrega_id, total, delivery, payer_name, payer_address, payer_phone, payer_zip);
    const { rows } = await db.query('INSERT INTO pedido (pago, modo_entrega_id, total, delivery, payer_name, payer_address, payer_phone, payer_zip, payment_hash, medio_pago_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id', [pago, modo_entrega_id, total, delivery, payer_name, payer_address, payer_phone, payer_zip, paymentHash, medio_pago_id]);
    // Insertar productos en la tabla pedido_producto
    for (const product of products) {
      await db.query('INSERT INTO pedido_productos (pedido_id, producto_id, cantidad, precio, talle_id) VALUES ($1, $2, $3, $4, $5)', [rows[0].id, product.product.id, product.quantity, product.product.precio, product.talle_id || null]);
    }

    //Disminuye el stock en producto_talles
    for (const product of products) {
      if (product.talle_id) {
        await db.query('UPDATE producto_talle SET stock = stock - $1 WHERE producto_id = $2 AND talle_id = $3', [product.quantity, product.product.id, product.talle_id]);
      }
    }

    //console.log(rows[0].id);
    return NextResponse.json({ message: "Order created successfully", orderId: rows[0].id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error creating order" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { orderId } = await req.json();
    await db.query('UPDATE pedido SET pago = $1 WHERE id = $2', [true, orderId]);
    return NextResponse.json({ message: "Order updated successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating order" }, { status: 500 });
  }
}
