import { Header } from '@/components/layout/header'
import { getCategories, getProducts } from '@/lib/queries'
import { ProductList } from '@/components/product-list'
import { TriangleAlert } from 'lucide-react';
import { FilterCategories } from '@/components/filter-categories';
import data from '@/lib/data';

interface ProductsPageProps {
  searchParams?: {
    category?: string;
    subcategory?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const category = searchParams?.category;
  const subcategory = searchParams?.subcategory;
  const products = await getProducts({ category, subcategory, visible: true, page: 1, limit: 24 });
  const categories = await getCategories();

  const categoryName = category ? (categories.find(c => c.id == category)?.nombre || category) : undefined;
  const pageTitle = categoryName ? `Categoría: ${categoryName}` : "Nuestros Productos";
  const pageDescription = category
    ? `Explora nuestra selección de productos en la categoría ${categoryName}.`
    : "Explora nuestra selección de motos, accesorios y vehículos eléctricos.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header categories={categories} />

      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar de filtros */}
        <div className="md:w-64 flex-shrink-0">
          <FilterCategories categorias={categories} />
        </div>

        {/* Contenido principal */}
        <div className="flex-grow">
          <div className="container mx-auto px-4 py-8">
            <div className="md:text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{pageTitle}</h1>
              <p className="mt-2 text-lg text-muted-foreground">
                {pageDescription}
              </p>
            </div>

            {products.length > 0 ? (
              <ProductList initialProducts={products} />
            ) : (
              <div className="text-center py-16">
                <p className="text-xl text-muted-foreground flex items-center justify-center">
                  <TriangleAlert className="inline-block h-6 w-6 text-red-500" />
                  <span className="font-bold ml-2">
                    {category ? `Aun no tenemos productos de la categoría ${categoryName} disponibles en la web.` : `Aun no tenemos productos disponibles en la web.`}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Icono flotante de whatsapp */}
      <a
        href={`https://wa.me/${data.telefono}?text=Hola%20Uzcudun%20Coffee%20and%20Ride!`}
        className="fixed bottom-4 right-4 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors z-50 h-12 w-12 flex items-center justify-center"
        target="_blank"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="h-14 w-14 font-bold" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
        </svg>
      </a>
    </div>
  )
}
