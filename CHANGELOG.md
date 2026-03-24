# Changelog - Uzcudun Coffee Ride

Todas las modificaciones realizadas en el proyecto se registrarán aquí, detallando la fecha, el avance y los archivos afectados.

---

## [2026-03-18 19:00] - Análisis Inicial y Configuración de Flujo
- **Avance:** Realización de un análisis profundo de la arquitectura del proyecto (Next.js, Socket.io, PostgreSQL). Se estableció el flujo de trabajo para el seguimiento de cambios y comentarios en el código.
- **Archivos editados:**
  - [NUEVO] `CHANGELOG.md`
  - [MODIFICADO] `readme.md` (Para referenciar la bitácora)

## [2026-03-24 10:25] - Centralización de Tipos y Corrección de Checkout
- **Avance:** Se centralizaron las interfaces y tipos comunes en `lib/types.ts` para mejorar la consistencia y escalabilidad. Se corrigió un error de importación en el formulario de envío que impedía el correcto funcionamiento del checkout.
- **Archivos editados:**
  - [MODIFICADO] `lib/types.ts`
  - [MODIFICADO] `components/checkout/shipping-form.tsx`
  - [MODIFICADO] `components/checkout/payment-selector.tsx`
  - [MODIFICADO] `app/checkout/page.tsx`
  - [MODIFICADO] `components/admin/product-form-dialog.tsx`
  - [MODIFICADO] `components/admin/user-form-dialog.tsx`
  - [MODIFICADO] `components/admin/users-table.tsx`
  - [MODIFICADO] `app/admin/users/page.tsx`
  - [MODIFICADO] `app/admin/categories/page.tsx`

## [2026-03-24 11:00] - Integración de Pasarela de Pago Nave
- **Avance:** Se implementó la integración con la pasarela de pagos Nave (Galicia/Naranja X) utilizando un diseño modular para facilitar su portabilidad. Se incluyó soporte para redirección directa, notificaciones en tiempo real (webhooks) y una guía de implementación.
- **Archivos editados:**
  - [NUEVO] `lib/nave.ts`
  - [NUEVO] `app/api/nave/status/route.ts`
  - [NUEVO] `app/api/nave/notifications/route.ts`
  - [NUEVO] `docs/nave_implementation.md`
  - [MODIFICADO] `app/api/checkout/route.ts`
  - [MODIFICADO] `.env.local`

## [2026-03-24 11:20] - Correcciones de Checkout y Estados de Pago
- **Avance:** Se solucionó el error que impedía que el carrito se vaciara automáticamente tras completar un pago exitoso en las pasarelas. Además, se alinearon los estados de pago entre los manejadores asíncronos (Webhooks de Nave y Payway) y el panel de administración, asegurando que ambos usen el estado `'paid'` para registrar los pagos aprobados. Se implementó también la actualización de base de datos faltante en el webhook de Payway.
- **Archivos editados:**
  - [MODIFICADO] `app/checkout/success/page.tsx`
  - [MODIFICADO] `app/api/nave/notifications/route.ts`
  - [MODIFICADO] `app/api/payway/notifications/route.ts`
