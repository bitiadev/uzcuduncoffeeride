'use client'

import { ProductCard } from '@/components/product-card';
import { useScrollAnimation } from '@/components/scroll-animations';
import type { Product } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_URL!);

export function FeaturedProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [itemsPerView, setItemsPerView] = useState(4);

  useScrollAnimation();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/products?featured=true');
        if (!response.ok) throw new Error('Error al cargar los productos destacados');
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
    socket.on('connect', () => console.log('Conectado al servidor de WebSocket'));
    socket.on('updateProducto', () => {
      setLoading(true);
      fetch('/api/products?featured=true')
        .then(r => { if (!r.ok) throw new Error('Error'); return r.json(); })
        .then(data => setProducts(data.slice(0, 10)))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
    return () => { socket.off('updateProducto'); };
  }, []);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setItemsPerView(1);
      else if (w < 1024) setItemsPerView(2);
      else setItemsPerView(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const maxIndex = Math.max(0, products.length - itemsPerView);

  useEffect(() => {
    setCurrentIndex(prev => Math.min(prev, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (isPaused || products.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [isPaused, maxIndex, products.length]);

  const prev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const next = () => setCurrentIndex(i => Math.min(maxIndex, i + 1));
  const cardWidthPct = 100 / itemsPerView;

  return (
    <section id="productos" className="py-16 px-4 bg-muted/30">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance animate-on-scroll">
          Productos Destacados
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((_, index) => (
              <div key={index} className="border border-border rounded-lg p-4 shadow animate-pulse">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground">Aún no tenemos productos destacados.</p>
        ) : (
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <Button
              variant="outline"
              size="icon"
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-md"
              onClick={prev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * cardWidthPct}%)` }}
              >
                {products.map((product) => (
                  <div
                    key={product.id}
                    style={{ minWidth: `${cardWidthPct}%` }}
                    className="px-3"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 rounded-full shadow-md"
              onClick={next}
              disabled={currentIndex === maxIndex}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {maxIndex > 0 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}