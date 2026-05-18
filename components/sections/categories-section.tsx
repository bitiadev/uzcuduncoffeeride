import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bike, Tag } from "lucide-react"
import Link from "next/link"
import { getCategories } from "@/lib/queries"

export async function CategoriesSection() {
  const categories = await getCategories();

  return (
    <section className="py-16 px-4" id="categories">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-balance animate-on-scroll">
          Nuestras Categorías
        </h2>
        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {categories.map((category: { id: number; nombre: string }, index: number) => (
              <Link key={category.id} href={`/products?category=${category.id}`} passHref>
                <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer hover-lift h-full animate-on-scroll"
                      style={{ animationDelay: `${100 * (index + 1)}ms` }}>
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors animate-float"
                         style={{ animationDelay: `${100 * (index + 1)}ms` }}>
                      <Tag className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{category.nombre}</CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>No hay categorías disponibles en este momento.</p>
          </div>
        )}
      </div>
    </section>
  )
}
