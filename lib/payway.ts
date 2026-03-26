
const sdkModulo = require('sdk-node-payway');

const publicKey = process.env.PAYWAY_PUBLIC_KEY;
const privateKey = process.env.PAYWAY_PRIVATE_KEY;
const ambient = process.env.PAYWAY_AMBIENT; // "developer" o "production"
const company = "Uzcudun Coffee Ride";
const user = "RAMIRO UZCUDUN";

// Inicialización única del SDK [7]
export const paywayClient = new sdkModulo.sdk(ambient, publicKey, privateKey, company, user);

export interface CheckoutArgs {
  total_price: number;
  //site_transaction_id: string;
  products: any[];
  shippingData: any;
  shippingPrice: number;
  success_url: string;
  cancel_url: string;
}

/**
 * Genera el hash necesario para el link de pago (Rubro RETAIL) [8]
 */
export const createCheckoutLink = async (args: CheckoutArgs) => {

  const products = Array.isArray(args.products)
    ? args.products.map((item: any) => {
      if (item && item.product) {
        const p = item.product;
        //const value = typeof p.precio_alternativo === 'number' && p.precio_alternativo > 0 ? p.precio_alternativo : p.precio;
        const value = typeof p.precio_alternativo === 'number' && p.precio;
        return {
          id: Number(p.id),
          value,
          description: p.nombre || p.descripcion || '',
          quantity: Number(item.quantity || 1),
        };
      }
      return {
        id: Number(item.id),
        value: Number(item.value),
        description: String(item.description ?? ''),
        quantity: Number(item.quantity ?? 1),
      };
    })
    : [];

  // Añadir el costo de envío como un producto oculto
  args.shippingPrice > 0 && products.push({
    id: 9999,
    value: args.shippingPrice,
    description: `Costo de envío a ${args.shippingData?.city || 'desconocido'}`,
    quantity: 1,
  });

  const params = {
    origin_platform: "SDK-Node",
    // Tanto productos como descripción del pago no pueden tener valores al mismo tiempo
    // payment_description: "TEST",
    currency: "ARS",
    products: products,
    total_price: args.total_price,
    site: process.env.PAYWAY_SITE_ID,
    // success_url: args.success_url,
    redirect_url: args.success_url, // Los campos success_url y redirect_url son mutuamente excluyentes
    cancel_url: args.cancel_url,
    notifications_url: `${process.env.NEXT_PUBLIC_URL}/api/payway/notifications`,
    template_id: 2, // Numérico (1 = sin Cybersource, 2 = con Cybersource)
    installments: [1], // Cuotas permitidas [8]
    plan_gobierno: false, 
    public_apikey: publicKey,
    auth_3ds: false
  };


  return new Promise((resolve, reject) => {
    try {
      paywayClient.checkout(params, function (result: any, err: any) {
        if (err) {
          console.error("Payway checkout error:", err);
          return reject(err);
        }
        if (result.payment_link) {
          resolve(result.payment_link);
        } else {
          reject(new Error(result.description));
        }
      })
    } catch (error) {
      console.error("Payway checkout exception:", error);
      reject(error);
    }
  });
};

/** Consulta el estado de un pago mediante su hash [9] */
export const getPaymentStatus = async (paymentHash: string) => {

  return new Promise((resolve, reject) => {
    try {
      paywayClient.paymentInfo(paymentHash, function (result: any, err: any) {
        if (err) {
          console.error("Payway paymentInfo error:", err);
          return reject(err);
        }
        console.log("Payway paymentInfo result:", result);
        resolve(result);
      })
    } catch (error) {
      console.error("Payway paymentInfo exception:", error);
      reject(error);
    }
  });
};
