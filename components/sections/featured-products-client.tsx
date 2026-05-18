'use client'

import { ProductCard } from '@/components/product-card';
import { useScrollAnimation } from '@/components/scroll-animations';
import type { Product } from '@/lib/types';
import { useEffect, useState } from 'react';
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_URL!);

export function FeaturedProductsClient() {

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Este hook ahora se ejecuta en un componente que ya tiene los productos,
  // por lo que puede encontrar los elementos a animar.
  useScrollAnimation();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/products?featured=true');
        if (!response.ok) {
          throw new Error('Error al cargar los productos destacados');
        }

        const featuredProducts: Product[] = await response.json();
        setProducts(featuredProducts.slice(0, 10));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Conectado al servidor de WebSocket');
    });
    socket.on('updateProducto', () => {
      console.log('Producto actualizado, recargando lista...');
      // Volver a cargar los productos
      setLoading(true);
      fetch('/api/products?featured=true')
        .then(response => {
          if (!response.ok) {
            throw new Error('Error al cargar los productos');
          }
          return response.json();
        })
        .then(data => {
          setProducts(data.slice(0, 10));
        })
        .catch(error => {
          console.error(error);
        })
        .finally(() => {
          setLoading(false);
        });
    });

    return () => {
      socket.off('updateProducto');
    };
  }, []);

  return (
    <>
      {
        loading ? (
          <section id="productos" className="py-16 px-4 bg-muted/30">
            <div className="container mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance animate-on-scroll">
                Productos Destacados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((_, index) => (
                  <div key={index} className={`animate-on-scroll animate-delay-${(index + 1) * 100}`}>
                    <div className="border border-border rounded-lg p-4 shadow animate-pulse">
                      <div className="h-48 bg-gray-200 rounded mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section id="productos" className="py-16 px-4 bg-muted/30">
            <div className="container mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance animate-on-scroll">
                Productos Destacados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length > 0 ? (
                  products.map((product, index) => (
                    //<div key={product.id} className={`animate-on-scroll animate-delay-${(index + 1) * 100}`}>
                    <div key={product.id}>
                      <ProductCard product={product} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center">
                    <p className="text-muted-foreground">Aún no tenemos productos destacados.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
    </>
  );
}