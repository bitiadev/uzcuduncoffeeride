
const clientId = process.env.NAVE_CLIENT_ID;
const clientSecret = process.env.NAVE_CLIENT_SECRET;
const audience = process.env.NAVE_AUDIENCE;
const authUrl = process.env.NAVE_AUTH_URL;
const apiUrl = process.env.NAVE_API_URL;
const posId = process.env.NAVE_POS_ID;

interface NaveTokenResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
}

/**
 * Obtiene el token de acceso de Nave
 */
export async function getNaveToken(): Promise<string> {
  if (!clientId || !clientSecret || !audience || !authUrl) {
    console.error('CRITICAL: Faltan credenciales de Nave en .env.local');
    throw new Error('CONFIG_MISSING: Faltan configuraciones de Nave (Client ID/Secret) en .env.local');
  }

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: audience,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Nave Auth Error:', error);
    throw new Error('Error de autenticación con Nave');
  }

  const data: NaveTokenResponse = await response.json();
  return data.access_token;
}

export interface NaveCheckoutArgs {
  external_payment_id: string;
  amount: number;
  products: any[];
  buyer?: {
    email: string;
    name: string;
    phone?: string;
    doc_type?: string;
    doc_number?: string;
    address?: {
      street: string;
      city: string;
      zipcode: string;
    };
  };
  callback_url?: string;
}

/**
 * Crea una intención de pago en Nave y retorna la checkout_url
 */
export async function createNaveCheckoutLink(args: NaveCheckoutArgs): Promise<any> {
  const token = await getNaveToken();

  const body = {
    external_payment_id: args.external_payment_id,
    seller: {
      pos_id: posId,
    },
    transactions: [
      {
        amount: {
          currency: 'ARS',
          value: args.amount.toFixed(2),
        },
        products: args.products.map((item: any) => {
          const p = item.product || item;
          return {
            name: p.nombre || p.name || 'Producto',
            description: p.descripcion || p.description || '',
            quantity: item.quantity || 1,
            unit_price: {
              currency: 'ARS',
              value: (Number(p.precio_alternativo || p.precio || 0)).toFixed(2),
            },
          };
        }),
      },
    ],
    buyer: args.buyer ? {
      user_email: args.buyer.email,
      name: args.buyer.name,
      phone: args.buyer.phone,
      doc_type: args.buyer.doc_type || 'DNI',
      doc_number: args.buyer.doc_number,
      billing_address: args.buyer.address ? {
        street_1: args.buyer.address.street,
        city: args.buyer.address.city,
        country: 'AR',
        zipcode: args.buyer.address.zipcode,
      } : undefined,
    } : undefined,
    additional_info: {
      callback_url: args.callback_url,
    },
  };

  const response = await fetch(`${apiUrl}/payment_request/ecommerce`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail = errorText;
    try {
      errorDetail = JSON.stringify(JSON.parse(errorText), null, 2);
    } catch (e) {}
    
    console.error('--- NAVE ERROR DETAILS ---');
    console.error('URL:', `${apiUrl}/payment_request/ecommerce`);
    console.error('Status:', response.status);
    console.error('Response:', errorDetail);
    console.error('Body sent:', JSON.stringify(body, null, 2));
    console.error('---------------------------');
    
    throw new Error(`Error Nave (${response.status}): ${errorText}`);
  }

  return await response.json();
}


/**
 * Recupera el estado de un pago en Nave
 * @param paymentId ID del pago en Nave
 */
export async function getNavePaymentStatus(paymentId: string): Promise<any> {
  const token = await getNaveToken();

  const response = await fetch(`${apiUrl}/ranty-payments/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Error al recuperar estado de pago en Nave:', error);
    throw new Error('Error al recuperar el estado del pago en Nave');
  }

  return await response.json();
}

