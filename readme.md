# Uzcudun Coffee Ride - Plataforma E-Commerce

## 1. Descripción General

**Uzcudun Coffee Ride** es una aplicación web de comercio electrónico full-stack construida con Next.js y TypeScript. La plataforma está diseñada para un negocio temático de motocicletas y café, ofreciendo una experiencia de compra fluida para los clientes y un panel de administración robusto para la gestión interna.

El proyecto cuenta con una interfaz pública para los clientes y un panel de administración protegido para gestionar los aspectos clave del negocio, como productos, categorías, pedidos y más.

## 2. Características Principales

La aplicación se divide en dos áreas principales: la tienda pública y el panel de administración.

### 2.1. Tienda Pública (Cara al Cliente)

- **Página de Inicio Dinámica:** Presenta la marca con una sección "hero", un carrusel de categorías y secciones de contenido temático.
- **Navegación de Productos:** Permite a los usuarios explorar el catálogo de productos (implícito en la estructura).
- **Carrito de Compras:** Un panel lateral (`Cart-Sidebar`) permite a los usuarios ver y gestionar los productos que desean comprar, gestionado a través de un contexto global de React.
- **Proceso de Checkout:** Una página dedicada para finalizar la compra.

### 2.2. Panel de Administración (`/admin`)

Un completo panel de control para la gestión integral de la tienda.

- **Dashboard Principal:** Ofrece una vista general y accesos rápidos a las principales funcionalidades.
- **Gestión de Categorías y Subcategorías:**
  - **CRUD completo:** Crear, leer, actualizar y eliminar categorías (`Rubros`) y subcategorías (`Subrubros`).
  - **Borrado Seguro:** Implementa una lógica que impide eliminar categorías que aún contienen subcategorías, protegiendo la integridad de los datos y notificando al administrador.
  - **Interfaz Intuitiva:** Utiliza diálogos modales para la creación/edición y menús desplegables para las acciones en cada fila de la tabla.
- **Gestión de Productos:** Módulo dedicado para administrar los productos de la tienda (CRUD implícito).
- **Gestión de Pedidos:** Módulo para la visualización y seguimiento de los pedidos de los clientes.
- **Gestión de Clientes/Usuarios:** Módulo para la administración de los usuarios registrados.
- **Reportes:** Sección dedicada a la generación de informes de ventas o de otro tipo.

## 3. Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org/) (con App Router)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Base de Datos:** [PostgreSQL](https://www.postgresql.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes de UI:**
  - [shadcn/ui](https://ui.shadcn.com/): Librería de componentes reusables y accesibles.
  - [Radix UI](https://www.radix-ui.com/): Primitivos de UI para la creación de componentes.
  - [Lucide React](https://lucide.dev/): Librería de íconos.
- **Gestor de Paquetes:** [pnpm](https://pnpm.io/)

## 4. Cómo Empezar

Sigue estos pasos para configurar y ejecutar el proyecto en un entorno de desarrollo local.

### 4.1. Prerrequisitos

- Node.js (v18 o superior)
- pnpm (instalado globalmente: `npm install -g pnpm`)
- Una instancia de PostgreSQL en ejecución.

### 4.2. Instalación

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/fdcrespi/uzcuduncoffeeride
    cd uzcudunmotors
    ```

2.  **Instalar dependencias:**
    ```bash
    pnpm install
    ```

3.  **Configurar la Base de Datos:**
    - Conéctate a tu instancia de PostgreSQL y crea una nueva base de datos.
    - Ejecuta el script `utils/database.sql` para crear todas las tablas, relaciones y poblar datos iniciales.

4.  **Variables de Entorno:**
    - Crea un archivo `.env.local` en la raíz del proyecto.
    - Añade las credenciales de tu base de datos. Basado en `lib/db.ts`, el formato debería ser similar a:
      ```env
      POSTGRES_URL="postgres://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_DB"
      ```

5.  **Ejecutar el servidor de desarrollo:**
    ```bash
    pnpm run dev
    ```

    La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 5. Estructura de la Base de Datos

La arquitectura de la base de datos se centra en las siguientes entidades principales:

- `Rubro` y `Subrubro`: Para la categorización jerárquica de productos.
- `Producto`: El catálogo de artículos en venta.
- `Pedido` y `Pedido_Productos`: Para gestionar las órdenes de los clientes.
- `Cliente` y `Usuario`: Para la gestión de clientes y administradores.
- `Comercio` y `Sucursal`: Para la información del negocio.
+
+---
+
+## 6. Bitácora de Desarrollo
+
+Para un seguimiento detallado de los cambios y avances del proyecto, consulta el archivo [CHANGELOG.md](./CHANGELOG.md).

---