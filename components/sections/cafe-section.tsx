"use client"
import { Button } from "@/components/ui/button"
import { Coffee, Bike, Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react";


function Carousel({ images, interval = 3000 }: { images: string[]; interval?: number }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!images || images.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), interval)
    return () => clearInterval(id)
  }, [images, interval])

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-xl" style={{ paddingTop: "66.6667%" }}>
      <div
        className="absolute inset-0 flex transition-transform duration-700"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src) => (
          <div key={src} className="flex-none w-full relative">
            <Image src={src} alt="Cafetería" fill className="object-cover" sizes="100vw" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CafeSection() {
  return (
    <section id="cafe" className="py-16 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-on-scroll animate-fade-in-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-balance">
              Más que una Tienda,
              <span className="text-primary"> una Experiencia</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6 text-pretty">
              Nuestro café es el punto de encuentro perfecto para motociclistas. Disfruta de café premium, snacks
              deliciosos y comparte historias de la carretera mientras planeas tu próxima aventura.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 animate-fade-in-left animate-delay-100">
                <Coffee className="w-6 h-6 text-primary" />
                <span>Café de especialidad tostado localmente</span>
              </div>
              <div className="flex items-center space-x-3 animate-fade-in-left animate-delay-200">
                <Bike className="w-6 h-6 text-primary" />
                <span>Ambiente motociclista auténtico</span>
              </div>
              <div className="flex items-center space-x-3 animate-fade-in-left animate-delay-300">
                <Star className="w-6 h-6 text-primary" />
                <span>Eventos y encuentros semanales</span>
              </div>
            </div>
            {/* <Button size="lg" className="mt-8 btn-motorcycle">
              Ver Menú Completo
            </Button> */}


            <Link
              className="mt-8 bg-primary text-white inline-flex hover:bg-primary/90 hover:scale-105 hover:transition-all hover:duration-300 transition-colors items-center justify-center gap-2 px-4 py-2 rounded-lg text-lg"
              href="https://drive.google.com/file/d/1cCujWybU9KmhHSrvIMCD0jba9NS-Vl5g/view?usp=drive_link" target="_blank">
              Nuestro Menú
              <Coffee className="ml-2 w-5 h-5" />
            </Link>


          </div>
          <div className="relative animate-on-scroll animate-fade-in-right">
            <div className="hover-lift">
              {/* <Image
                src="/motorcycle-cafe-interior-with-bikes-and-coffee.jpg"
                alt="Interior de la cafetería"
                width={600}
                height={500}
                className="rounded-lg shadow-xl"
              /> */}
              <Carousel
                images={[
                  "/images/cafeteria1.webp",
                  "/images/cafeteria2.webp",
                  "/images/cafeteria3.webp",
                ]}
                interval={3500}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
