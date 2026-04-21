import type React from "react"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { CartProvider } from "@/contexts/cart-context"
import { Toaster } from "@/components/ui/toaster"
import { RemoveItemDialog } from "@/components/cart/remove-item-dialog"
import "./globals.css"
import Providers from "./providers"
import Script from "next/script"

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Uzcudun Coffe & Ride",
  description:"Tu destino para motocicletas, vehículos eléctricos, accesorios y el mejor café. Descubre nuestra amplia gama de productos.",
  generator: "Bitia",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {  
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          strategy="afterInteractive"
        />
      </head>
      <body className={`font-sans ${montserrat.variable} ${GeistMono.variable}`}>        
        <CartProvider>
          <Providers>
            <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
          </Providers>
          <Toaster />
          <RemoveItemDialog />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
