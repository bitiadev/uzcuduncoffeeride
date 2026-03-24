# Guía de Implementación de Pasarela Nave

Este documento explica cómo implementar o portar la integración de la pasarela de pagos Nave (Galicia/Naranja X).

## 1. Variables de Entorno (.env.local)

Agregá las siguientes variables a tu archivo `.env.local`:

```env
# CREDENCIALES NAVE
NAVE_CLIENT_ID=tu_client_id
NAVE_CLIENT_SECRET=tu_client_secret
NAVE_POS_ID=tu_pos_id

# ENDPOINTS NAVE (Ejemplos de Sandbox)
NAVE_AUTH_URL=https://homoservices.apinaranja.com/security-ms/api/security/auth0/b2b/m2msPrivate
NAVE_API_URL=https://api-sandbox.ranty.io/api
NAVE_AUDIENCE=https://naranja.com/ranty/merchants/api

# URL DE TU APP
NEXT_PUBLIC_URL=https://tu-dominio.com
```

## 2. Servicio Principal (lib/nave.ts)

Copiá el archivo `lib/nave.ts`. Este archivo se encarga de:
- Autenticación (`getNaveToken`).
- Creación de Intención de Pago (`createNaveCheckoutLink`).
- Recuperación del Estado del Pago (`getNavePaymentStatus`).

## 3. Rutas de API (Endpoints)

### Iniciación del Checkout
En tu ruta de checkout (ej. `app/api/checkout/route.ts`), llamá a `createNaveCheckoutLink`:

```typescript
const naveData = await createNaveCheckoutLink({
  external_payment_id: `tu-id-de-orden`,
  amount: montoTotal,
  products: articulosDelCarrito,
  buyer: {
    email: emailUsuario,
    name: nombreUsuario,
    // ... otros datos del comprador
  },
  callback_url: `${process.env.NEXT_PUBLIC_URL}/api/nave/status`,
});

return NextResponse.json({ url: naveData.checkout_url, paymentHash: naveData.id });
```

### Manejador de Retorno (Redirección)
Creá `app/api/nave/status/route.ts`. Este endpoint recibe al usuario después del proceso de checkout en Nave. Debe verificar el estado y redirigir a una página de éxito o error.

### Notificaciones (Webhook)
Creá `app/api/nave/notifications/route.ts`. Este endpoint recibe notificaciones POST en tiempo real desde Nave cada vez que un pago cambie de estado.
**Importante**: Debés configurar esta URL en el portal de desarrolladores de Nave.

## 4. Integración con la Base de Datos

En el manejador de notificaciones, actualizá tu tabla de pedidos:
```typescript
if (paymentData.status.name === 'APPROVED') {
  await db.query('UPDATE pedido SET pago = true WHERE payment_hash = $1', [payment_id]);
}
```

## 5. Resumen de Archivos a Portar
- `lib/nave.ts`
- `app/api/nave/status/route.ts`
- `app/api/nave/notifications/route.ts`
- Punto de integración en `app/api/checkout/route.ts`
