import { db } from "./db";
import { unstable_noStore as noStore } from 'next/cache';
import { Product } from "./types";

export async function getCategories() {
  noStore();
  try {
    const { rows } = await db.query(`SELECT id, nombre FROM Rubro ORDER BY nombre ASC`);
    return rows;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

interface GetProductsOptions {
  category?: string; // rubro_id (ID)
  subcategory?: string; // subrubro_id (ID)
  featured?: boolean;
  visible?: boolean;
  page?: number;
  limit?: number;
}

export async function getProducts(options: GetProductsOptions = {}): Promise<Product[]> {
  noStore();
  try {
    const { category, subcategory, featured, visible, page = 1, limit } = options;
    const sucursalId = 1; // Asumimos la sucursal principal
    const params: any[] = [sucursalId];
    const offset = limit ? (page - 1) * limit : undefined;

    let query = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion, 
        p.destacado,
        p.visible,
        p.exhibicion,
        sp.precio, 
        sp.moneda,
        sp.precio_alternativo,
        sp.stock,
        sr.id as subrubro_id,
        sr.nombre as subrubro_nombre,
        r.nombre as category,
        pp.cover_url
      FROM Producto p
      LEFT JOIN Sucursal_Productos sp ON p.id = sp.producto_id
      LEFT JOIN Subrubro sr ON p.subrubro_id = sr.id
      LEFT JOIN Rubro r ON sr.rubro_id = r.id
      LEFT JOIN Producto_Portada pp ON pp.producto_id = p.id
      WHERE (sp.sucursal_id = $1 OR sp.sucursal_id IS NULL)
    `;

    if (visible !== undefined) {
      params.push(visible);
      query += ` AND p.visible = $${params.length}`;
    }

    if (featured) {
      params.push(true);
      query += ` AND p.destacado = $${params.length}`;
    }
    
    if (category) {
      params.push(category);
      query += ` AND r.id = $${params.length}`;
    }

    if (subcategory) {
      params.push(subcategory);
      query += ` AND sr.id = $${params.length}`;
    }

    query += ` ORDER BY p.id DESC`;
    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
      if (offset !== undefined) {
        params.push(offset);
        query += ` OFFSET $${params.length}`;
      }
    }

    const result = await db.query(query, params);

    const products = result.rows.map(p => ({
      id: String(p.id),
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio !== null ? Number(p.precio) : 0,
      precio_alternativo: p.precio_alternativo !== null ? Number(p.precio_alternativo) : 0,
      moneda: p.moneda || 'ARS',
      image: p.cover_url || '/placeholder.svg',
      stock: p.stock !== null ? Number(p.stock) : 0,
      subrubro_id: String(p.subrubro_id),
      subrubro_nombre: p.subrubro_nombre,
      category: p.category,
      destacado: p.destacado,
      visible: p.visible,
      exhibicion: p.exhibicion,
    }));

    return products;

  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

// --- Payment Router Queries ---

export async function getGateways() {
  noStore();
  try {
    const { rows } = await db.query(`SELECT id, nombre, habilitada FROM pasarela ORDER BY id ASC`);
    return rows;
  } catch (error) {
    console.error('Error fetching gateways:', error);
    return [];
  }
}

export async function toggleGateway(id: number, habilitada: boolean) {
  try {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE pasarela SET habilitada = $1 WHERE id = $2`, [habilitada, id]);
      if (!habilitada) {
        // Si se deshabilita, quitar asignación a medios de pago
        await client.query(`UPDATE mediopago SET pasarela_id = NULL WHERE pasarela_id = $1`, [id]);
      }
      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error toggling gateway:', error);
    return false;
  }
}

export async function getPaymentMethods() {
  noStore();
  try {
    const { rows } = await db.query(`
      SELECT m.id, m.nombre, m.logo_url, m.badge_texto, m.pasarela_id, p.nombre as pasarela_nombre
      FROM mediopago m
      LEFT JOIN pasarela p ON m.pasarela_id = p.id
      ORDER BY m.nombre ASC
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return [];
  }
}

export async function assignGatewayToMethod(methodId: number, gatewayId: number | null) {
  try {
    await db.query(`UPDATE mediopago SET pasarela_id = $1 WHERE id = $2`, [gatewayId, methodId]);
    return true;
  } catch (error) {
    console.error('Error assigning gateway to method:', error);
    return false;
  }
}

export async function getActivePaymentMethods() {
  noStore();
  try {
    // Solo medios que tienen una pasarela activa asignada
    const { rows } = await db.query(`
      SELECT m.id, m.nombre, m.logo_url, m.badge_texto, p.nombre as pasarela_nombre
      FROM mediopago m
      JOIN pasarela p ON m.pasarela_id = p.id
      WHERE p.habilitada = TRUE
      ORDER BY m.nombre ASC
    `);
    return rows;
  } catch (error) {
    console.error('Error fetching active payment methods:', error);
    return [];
  }
}

export async function getGatewayByMethodId(methodId: number) {
  noStore();
  try {
    const { rows } = await db.query(`
      SELECT p.nombre, p.habilitada
      FROM mediopago m
      JOIN pasarela p ON m.pasarela_id = p.id
      WHERE m.id = $1
    `, [methodId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error fetching gateway by method id:', error);
    return null;
  }
}
