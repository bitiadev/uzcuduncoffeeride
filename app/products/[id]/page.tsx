"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { toast } from "@/hooks/use-toast";

// Tipos
import { Product as BaseProduct, Size } from "@/lib/types";
import { Header } from "@/components/layout/header";

// 🔸 NUEVO: selector de talles
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// 🔸 NUEVO: galería
import ProductGallery from "@/components/ProductGallery";

// socket io
import { io } from "socket.io-client";
const socket = io(process.env.NEXT_PUBLIC_URL!);

// Extiendo el tipo Product para permitir images[] que devuelve la API de detalle
type ProductImage = { id: number; url: string; is_principal: boolean; orden: number };
type Product = BaseProduct & { images?: ProductImage[] };

export default function ProductDetailPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔸 NUEVO: estado de talles
  const [sizes, setSizes] = useState<Size[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);

  const params = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { id } = params as { id?: string };

  // Carga inicial del producto
  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error("Producto no encontrado");
        const data = await response.json();
        setProduct(data as Product);
      } catch (error) {
        console.error(error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // 🔸 NUEVO: cargar talles asociados al producto
  useEffect(() => {
    if (!id) return;
    const fetchSizes = async () => {
      try {
        const res = await fetch(`/api/products/${id}/sizes`);
        if (!res.ok) throw new Error("No se pudieron cargar los talles");
        const data = await res.json();
        setSizes(data || []);
        // Reset selección si el producto cambió
        setSelectedSizeId(null);
      } catch (e) {
        console.error(e);
        setSizes([]);
      }
    };
    fetchSizes();
  }, [id]);

  // Suscripción a socket para refrescar si actualizan el producto
  useEffect(() => {
    const onConnect = () => {
      console.log("Conectado al servidor de WebSocket");
    };
    const onUpdate = () => {
      console.log("Producto actualizado, recargando detalles...");
      if (!id) return;
      setLoading(true);
      fetch(`/api/products/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Error al cargar el producto");
          return res.json();
        })
        .then((data) => setProduct(data as Product))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    };

    socket.on("connect", onConnect);
    socket.on("updateProducto", onUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("updateProducto", onUpdate);
    };
  }, [id]);

  const needSizeSelection = sizes.length > 0;
  const selectedSize = sizes.find((s) => s.id === selectedSizeId) || null;

  const ensureSizeSelected = () => {
    if (needSizeSelection && !selectedSize) {
      toast({
        title: "Seleccioná un talle",
        description: "Este producto requiere que elijas un talle.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleWhatsAppInquiry = () => {
    if (!product) return;
    const phone = "5491112345678"; // 🔸 Reemplazar con el número de teléfono real
    const message = `Hola, estoy interesado/a en el producto "${product.nombre}" (ID: ${product.id}). ¿Podrían darme más información?`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (!ensureSizeSelected()) return;

    addItem(product, selectedSize ? { talle_id: selectedSize.id, talle_nombre: selectedSize.nombre } : undefined);
    toast({
      title: "¡Agregado!",
      description: `Se ha añadido ${product.nombre}${selectedSize ? ` (talle ${selectedSize.nombre})` : ""} al carrito.`,
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (!ensureSizeSelected()) return;

    addItem(product, selectedSize ? { talle_id: selectedSize.id, talle_nombre: selectedSize.nombre } : undefined);
    router.push("/checkout");
  };

  if (loading) return <ProductSkeleton />;

  if (!product) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold">Producto no encontrado</h1>
        <p className="text-muted-foreground">
          El producto que buscas no existe o no está disponible.
        </p>
      </div>
    );
  }

  // 🔸 Preparo las imágenes para la galería
  const galleryImages =
    product.images && product.images.length > 0
      ? product.images
          .sort((a, b) => a.orden - b.orden)
          .map((img, idx) => ({
            src: img.url,
            alt: `${product.nombre} - imagen ${img.orden ?? idx + 1}`,
          }))
      : [{ src: product.image || "/placeholder.svg", alt: product.nombre }];

  return (
    <>
      {/* <Header /> */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid w-full gap-8 md:grid-cols-2 md:gap-12">
          {/* Columna de Imagen / Galería */}
          <div className="w-full min-w-0">
            {/* 🔸 Si hay varias imágenes, mostramos la galería. Si es una sola (fallback), igual la galería la muestra ok */}
            <div className="w-full mx-auto max-w-lg">
              <ProductGallery
                images={galleryImages}
                layout="auto"       // vertical en desktop, horizontal en mobile (según lo definido)
                zoom="auto"         // pinch-zoom en mobile, doble tap/click desktop
                fullscreen={true}   // modal fullscreen habilitado
                animation="fade"    // fade/slide suave
                className="w-full"
              />
            </div>
          </div>

          {/* Columna de Detalles y Acciones */}
          <div className="flex flex-col pt-4">
            <h1 className="mb-4 text-left text-3xl font-bold md:text-4xl">
              {product.nombre}
            </h1>

            <div className="mb-6">
              <p className="text-left text-4xl font-extrabold text-black">
                {product.moneda === 'ARS' ? '$' : 'USD'}{' '}
                {product.precio.toLocaleString("es-AR")}
              </p>
              {/* <p>En 6 cuotas sin interés de {product.moneda === 'ARS' ? '$' : 'USD'} {Math.round(product.precio / 6).toLocaleString("es-AR")}</p> */}
              {product.precio_alternativo > 0 && (
                <p className="text-left text-xl font-bold text-muted-foreground">
                  {product.moneda === 'ARS' ? '$' : 'USD'}{' '}
                  {product.precio_alternativo.toLocaleString("es-AR")} por transferencia
                </p>
              )}
              
            </div>

            {product.exhibicion && (
              <p className="mb-6 text-left text-sm text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                Este producto es de exhibición. Para comprarlo, por favor consultanos directamente a través de WhatsApp.
              </p>
            )}

            {product.stock > 0 && !product.exhibicion && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Stock disponible: 
                  <span className="text-gray-500 font-normal">
                    ({product.stock} disponibles)
                  </span>
                </h3>
              </div>
            )}

            {/* 🔸 NUEVO: Selector de talles si el producto los tiene */}
            {needSizeSelection && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Seleccioná tu talle</h3>
                <ToggleGroup type="single" value={selectedSizeId?.toString() ?? ""} onValueChange={(val) => {
                  const nextId = val ? Number(val) : null;
                  setSelectedSizeId(nextId);
                }}>
                  {sizes.map((s) => (
                    <ToggleGroupItem key={s.id} value={String(s.id)} aria-label={`Talle ${s.nombre}`} disabled={(s.stock ?? 0) <= 0}>
                      {s.nombre}{typeof s.stock === 'number' ? ` (${s.stock})` : ''}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                {!selectedSize && (
                  <p className="mt-2 text-sm text-muted-foreground">Debés elegir un talle para continuar.</p>
                )}
                {selectedSize && typeof selectedSize.stock === 'number' && selectedSize.stock <= 0 && (
                  <p className="mt-2 text-sm text-red-600">Sin stock para el talle seleccionado.</p>
                )}
              </div>
            )}

            <div className="flex w-full max-w-xs flex-col gap-3">
              {product.exhibicion ? (
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleWhatsAppInquiry}
                >
                  <svg fill="#ffffff" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <title>whatsapp</title> <path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z"></path> </g></svg>

                  Consultar por WhatsApp
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleBuyNow}
                    disabled={product.stock <= 0 || (needSizeSelection && (!selectedSize || (typeof selectedSize.stock === 'number' && selectedSize.stock <= 0)))}
                  >
                    Comprar ahora
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleAddToCart}
                    disabled={product.stock <= 0 || (needSizeSelection && (!selectedSize || (typeof selectedSize.stock === 'number' && selectedSize.stock <= 0)))}
                  >
                    Agregar al carrito
                  </Button>
                </>
              )}
            </div>
            {product.stock <= 0 && (
              <p className="mt-4 font-semibold text-red-600">
                Producto sin stock
              </p>
            )}

            <div className="mt-8 border-t pt-6">
              <h3 className="mb-2 text-lg font-semibold">Características</h3>
              <p className="text-muted-foreground">
                {product.descripcion || "No hay descripción disponible."}
              </p>
            </div>
          </div>
        </div>

        <div className="my-12 border-t" /> {/* Separador */}

        {/* Boton para regresar */}
        <div className="flex justify-center">
          <Button variant="link" onClick={() => router.back()} className="cursor-pointer">
            &larr; Volver
          </Button>
        </div>
        
      </div>
    </>
  );
}

// Skeleton
function ProductSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <Skeleton className="mx-auto aspect-square w-full max-w-[500px]" />
        <div className="flex flex-col space-y-6 pt-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-6 w-1/3" />
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-3 pt-6">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
