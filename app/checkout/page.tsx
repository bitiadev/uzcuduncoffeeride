"use client";

import type React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { QuantityControl } from "@/components/ui/quantity-control";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { ArrowLeft, Edit, MapPin, Shield, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import { toast } from "@/hooks/use-toast";
import type { CartItem, ShippingData, ActivePaymentMethod } from "@/lib/types";
import { AddressInput } from "@/components/checkout/addressAutocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import data from "@/lib/data";
import { io } from "socket.io-client";
import { sendEmailAviso } from "@/lib/mail";
import { cn } from "@/lib/utils";
import { PaymentSelector } from "@/components/checkout/payment-selector";


const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== "undefined" ? window.location.origin : "");
const socket = io(SOCKET_URL, { transports: ["websocket"] });

/* =========================
   Tipos y utilidades extra
   ========================= */

type ShippingQuote = { amount: number; eta?: number; source: "match" | "fallback" };

function useDebounced<T>(value: T, delay = 650) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// Definición de tipos (tuyos)
// Movidos a lib/types.ts

interface ShippingFormProps {
  shippingData: ShippingData;
  setShippingData: (data: ShippingData) => void;
  isMobile: boolean;
  onStepForward: () => void;
}

interface OrderSummaryProps {
  items: CartItem[];
  totalPrice: number;
  shipping: number;
  finalTotal: number;
  isProcessing: boolean;
  handleCreatePreference: () => void;
  preferenceId: string | null;
  isMobile: boolean;
  onBack: () => void;
  updateQuantity: (productId: string, quantity: number, talleId?: number) => void;

  // 👇 NUEVO: estado de la cotización para mostrar feedback al usuario
  shippingLoading: boolean;
  shippingError: string | null;
  shippingSource: "match" | "fallback" | null;

  // 👇 NUEVO: navegación de pasos en desktop
  step: number;
  setStep: (step: number) => void;
  selectedMethod: ActivePaymentMethod | null;
}

/* =========================
   Sub-componente: ShippingForm
   ========================= */
const ShippingForm: React.FC<ShippingFormProps> = ({ shippingData, setShippingData, onStepForward }) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setShippingData({ ...shippingData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStepForward();
  };

  const handleDeliveryMethodChange = (value: string) => {
    setShippingData({ ...shippingData, deliveryMethod: value as "shipping" | "pickup" });
  };

  return (
    <form onSubmit={handleSubmit} id="shipping-form">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Información de Envío
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            defaultValue={shippingData.deliveryMethod}
            onValueChange={handleDeliveryMethodChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="shipping" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Truck className="w-4 h-4" /> Envío a domicilio
              </TabsTrigger>
              <TabsTrigger value="pickup" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Store className="w-4 h-4" /> Retiro en tienda
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shipping" className="mt-4">
              {/* Contenido para envío a domicilio */}
            </TabsContent>

            <TabsContent value="pickup" className="mt-4">
              <div className="p-4 border rounded-md bg-muted/30 mb-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">{data.nombre}</h3>
                    <p className="text-sm text-muted-foreground">{data.direccion}, {data.ciudad}</p>
                    <p className="text-sm text-muted-foreground">Horario: {data.horarios}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" name="firstName" value={shippingData.firstName} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" name="lastName" value={shippingData.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={shippingData.email} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" value={shippingData.phone} onChange={handleChange} required />
          </div>

          {shippingData.deliveryMethod === "shipping" && (
            <>
              <AddressInput shippingData={shippingData} setShippingData={setShippingData} />
              <div className="flex gap-4">
                <div className="flex-1 basis-[60%]">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" name="city" value={shippingData.city} onChange={handleChange} required={shippingData.deliveryMethod === "shipping"} />
                </div>
                <div className="flex-1 basis-[30%]">
                  <Label htmlFor="zipCode">Cod.Postal</Label>
                  <Input id="zipCode" name="zipCode" value={shippingData.zipCode} onChange={handleChange} required={shippingData.deliveryMethod === "shipping"} />
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes">Notas del pedido (opcional)</Label>
            <Textarea id="notes" name="notes" value={shippingData.notes} onChange={handleChange} placeholder={shippingData.deliveryMethod === "shipping" ? "Instrucciones especiales de entrega..." : "Instrucciones especiales para el retiro..."} />
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

/* =========================
   Sub-componente: OrderSummary
   ========================= */
const OrderSummary: React.FC<OrderSummaryProps> = ({
  items, totalPrice, shipping, finalTotal, isProcessing, handleCreatePreference, preferenceId, isMobile, onBack, updateQuantity,
  shippingLoading, shippingError, shippingSource, step, setStep, selectedMethod
}) => (
  <div className={cn("flex flex-col", !isMobile && "h-full")}>
    {/* Área de contenido con scroll */}
    <div className={cn("space-y-6 pr-2", !isMobile && "flex-grow overflow-y-auto")}>
      <Card>
        <CardHeader>
          <CardTitle>Resumen del Pedido</CardTitle>
          <CardDescription>
            {items.length} {items.length === 1 ? "artículo" : "artículos"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.product.id} className="flex items-start space-x-4">
              <div className="relative w-16 h-16 rounded-md overflow-hidden">
                <Image src={item.product.image || "/placeholder.svg"} alt={item.product.nombre} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium leading-tight">{item.product.nombre}</h4>
                {item.talle_nombre && (
                  <p className="text-xs text-muted-foreground">Talle: {item.talle_nombre}</p>
                )}
                <QuantityControl
                  quantity={item.quantity}
                  onUpdate={(newQuantity) => updateQuantity(item.product.id, newQuantity, item.talle_id)}
                  stock={item.product.stock}
                />
                <p className="text-sm text-gray-400">Podes comprar hasta: {item.product.stock} unidades</p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {item.product.moneda === 'ARS' ? '$' : 'USD'}{" "}
                  {(item.product.precio * item.quantity).toLocaleString("es-AR")}
                </p>
              </div>
            </div>
          ))}
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Envío:</span>
              <span className="text-right">
                {shippingLoading
                  ? "Calculando…"
                  : shippingError
                    ? <span className="text-red-600">{shippingError}</span>
                    : Number.isFinite(shipping)
                      ? `$${shipping.toLocaleString("es-AR")}` : "—"}
              </span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>

          {/* 👇 NUEVO: Mostrar medio de pago seleccionado en el resumen */}
          {(step === 3 || (isMobile && step === 2)) && selectedMethod && (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-center gap-3">
              <div className="relative w-8 h-8 flex-shrink-0 bg-white rounded border p-1">
                <Image src={selectedMethod.logo_url || "/placeholder.svg"} alt={selectedMethod.nombre} fill className="object-contain" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none">Medio de pago</p>
                <p className="text-sm font-bold">{selectedMethod.nombre}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>

    {/* Footer fijo con acciones */}
    <div className="flex-shrink-0 pt-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Compra segura y protegida</span>
          </div>

          {preferenceId ? (
            <Wallet initialization={{ preferenceId }} />
          ) : isProcessing ? (
            <Skeleton className="h-11 w-full" />
          ) : (
            // En Mobile, mostramos el botón según el paso. En Desktop, solo mostramos el botón de pago en el paso final.
            (isMobile || step === 3) && (
              <Button
                onClick={() => {
                  if (isMobile && step === 1) setStep(2);
                  else if (isMobile && step === 2) handleCreatePreference(); // En mobile, el paso 2 ya es el final (con selector integrado o resumen)
                  else handleCreatePreference();
                }}
                className="w-full"
                size="lg"
              >
                {isMobile && step === 1 ? "Continuar al pago" : "Confirmar y Pagar"}
              </Button>
            )
          )}

          {isMobile && (
            <Button onClick={onBack} className="w-full" size="lg" variant="outline">
              Volver
            </Button>
          )}

          {!isMobile && (
            <Link href="/" className="w-full inline-block text-center">
              <Button className="w-full" size="lg" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a la tienda
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  </div>
);

/* =========================
   Componente Principal: CheckoutPage
   ========================= */
export default function CheckoutPage() {
  const { items, getTotalPrice, updateQuantity } = useCart();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [shippingData, setShippingData] = useState<ShippingData>({
    firstName: "", lastName: "", email: "", phone: "", address: "", city: "", zipCode: "", notes: "", deliveryMethod: "shipping",
  });
  const [selectedMethod, setSelectedMethod] = useState<ActivePaymentMethod | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isMobile = useIsMobile();

  // 👇 NUEVO: estado de cotización
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const cpDebounced = useDebounced(shippingData.zipCode, 650);
  const quoteCacheRef = useRef<Map<string, ShippingQuote>>(new Map());
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const mpKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    if (mpKey) {
      initMercadoPago(mpKey, { locale: "es-AR" });
    }
  }, []);

  useEffect(() => {
    // Si el carrito se vacía, invalida la preferencia y vuelve a tienda
    if (items.length === 0 && !isProcessing) {
      setPreferenceId(null);
      router.push('/');
    }
  }, [items, isProcessing, router]);

  // 👇 NUEVO: función para cotizar (tolerante a nombres de campos)
  async function fetchQuote(cp: string) {
    // Si es retiro en tienda, no calculamos envío
    if (shippingData.deliveryMethod === "pickup") {
      setShippingQuote({ amount: 0, source: "fallback" });
      setShippingError(null);
      return;
    }

    const cpTrim = (cp || "").trim();
    if (cpTrim.length < 4) {
      setShippingQuote(null);
      setShippingError(null);
      return;
    }

    const cached = quoteCacheRef.current.get(cpTrim);
    if (cached) {
      setShippingQuote(cached);
      setShippingError(null);
      return;
    }

    inflightRef.current?.abort();
    const ctrl = new AbortController();
    inflightRef.current = ctrl;

    try {
      setShippingLoading(true);
      setShippingError(null);

      const res = await fetch(`/api/shipping/quote?cp=${encodeURIComponent(cpTrim)}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });

      if (res.status === 404) {
        setShippingQuote(null);
        setShippingError("No encontramos una tarifa para ese CP.");
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Tolerar dos posibles formas:
      //  A) { cp, fee, eta_days, source }
      //  B) { cp, costo, plazo_dias, fuente }
      const data = await res.json();
      const fee = Number(data?.fee ?? data?.costo ?? 0);
      const eta = data?.eta_days ?? data?.plazo_dias ?? undefined;
      const src = (data?.source ?? data?.fuente) as "match" | "fallback" | undefined;

      const q: ShippingQuote = { amount: fee || 0, eta: eta ?? undefined, source: src || "fallback" };
      quoteCacheRef.current.set(cpTrim, q);
      setShippingQuote(q);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setShippingError("Error al calcular envío. Reintentá.");
        setShippingQuote(null);
      }
    } finally {
      setShippingLoading(false);
      inflightRef.current = null;
    }
  }

  // 👇 NUEVO: triggers del cálculo (al tipear CP, debounce o cambiar método)
  useEffect(() => {
    if (cpDebounced || shippingData.deliveryMethod === "pickup") {
      fetchQuote(cpDebounced);
    } else {
      setShippingQuote(null);
      setShippingError(null);
    }
  }, [cpDebounced, shippingData.deliveryMethod]);

  // 👇 NUEVO: si entras a “Resumen” en mobile, asegurá última cotización
  useEffect(() => {
    if (step === 2 && shippingData.zipCode) {
      fetchQuote(shippingData.zipCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const totalPrice = getTotalPrice();
  const shipping = shippingQuote?.amount ?? 0; // si no hay quote, 0 (fallback actual)
  const finalTotal = totalPrice + shipping;

  const handleCreatePreference = async () => {
    if (!selectedMethod) {
      toast({
        title: "Seleccioná un medio de pago",
        description: "Debés elegir cómo vas a pagar para continuar.",
        variant: "destructive",
      });
      return;
    }

    const { notes, ...requiredData } = shippingData;

    // Validar campos según el método de entrega
    let isFormValid = true;
    if (shippingData.deliveryMethod === "shipping") {
      // Para envío a domicilio, validar todos los campos
      isFormValid = (Object.values(requiredData) as string[]).every((value) => value.trim() !== "");
    } else {
      // Para retiro en tienda, validar solo los campos necesarios (excluir address, city, zipCode)
      const { address, city, zipCode, ...requiredPickupData } = requiredData;
      isFormValid = (Object.values(requiredPickupData) as string[]).every((value) => value.trim() !== "");
    }

    if (!isFormValid) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor, completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    // 🔒 Recalcular por seguridad justo antes de pagar
    try {
      await fetchQuote(shippingData.zipCode);
    } catch { }

    // Si es retiro en tienda, el envío es 0
    const shippingToSend = shippingData.deliveryMethod === "pickup"
      ? 0
      : quoteCacheRef.current.get((shippingData.zipCode || "").trim())?.amount ?? 0;

    if (shippingData.deliveryMethod === "shipping" && shippingError) {
      toast({
        title: "No pudimos calcular el envío",
        description: "Revisá el código postal e intentá nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setIsRedirecting(true); // Mostrar de entrada


    //👇NUEVO: llamada a API para crear preferencia de pago
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          amount: finalTotal,
          products: items,
          shippingData: shippingData,
          shippingPrice: shippingToSend,
          medioPagoId: selectedMethod.id
        }),
      });
      const data = await res.json();

      if (data.url) {
        // Guardar pedido en base de datos antes de redirigir
        //const orderId = await SaveOrder(shippingData, finalTotal, items, shippingToSend, data.paymentHash);
        //window.location.href = data.url; // Redirección externa a Payway [13]
        const orderId = await SaveOrder(shippingData, finalTotal, items, shippingToSend, data.paymentHash, selectedMethod.id);
        sendEmailAviso(orderId); // Enviar email de aviso al admin

        // Pequeño delay para que el usuario vea el estado de procesamiento si la red es muy rápida
        setTimeout(() => {
          window.location.href = data.url;
        }, 1500);
      } else {
        setIsRedirecting(false); // Ocultar si falló
        toast({
          title: "Error al crear el pago",
          description: `Hubo un problema al conectar con ${selectedMethod?.pasarela_nombre || 'la pasarela'}. Intenta de nuevo.`,
          variant: "destructive",
        });
        throw new Error("URL de pago no válida");
      }
    } catch (error) {
      setIsRedirecting(false);
      console.error(error);
      toast({
        title: "Error al crear el pago",
        description: `Hubo un problema al conectar con ${selectedMethod?.pasarela_nombre || 'la pasarela'}. Intenta de nuevo.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }

    /* try {
      const response = await fetch("/api/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, shippingData, shipping: shippingToSend }),
      });

      if (!response.ok) throw new Error("Failed to create preference");

      const { id } = await response.json();
      setPreferenceId(id);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al crear el pago",
        description: "Hubo un problema al conectar con Mercado Pago. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    } */
  };

  const SaveOrder = async (shippingData: ShippingData, totalPrice: number, items: CartItem[], shipping: number, paymentHash: string, medioPagoId: number) => {
    // NUEVO: Guardar pedido en base de datos
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          pago: false,
          modo_entrega_id: shippingData.deliveryMethod === "shipping" ? 1 : 2,
          total: totalPrice,
          delivery: shipping,
          payer_name: shippingData.firstName + " " + shippingData.lastName,
          payer_address: shippingData.address,
          payer_phone: shippingData.phone,
          payer_zip: shippingData.zipCode,
          products: items,
          paymentHash: paymentHash,
          medio_pago_id: medioPagoId
        }),
      });
      if (res.ok) {
        const data = await res.json();
        socket.emit('addPedido', 'Pedido actualizado');
        return data.orderId;
      } else {
        toast({
          title: "Error al guardar el pedido",
          description: "Hubo un problema al guardar el pedido. Intenta de nuevo.",
          variant: "destructive",
        });
        return "";
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al guardar el pedido",
        description: "Hubo un problema al guardar el pedido. Intenta de nuevo.",
        variant: "destructive",
      });
      return "";
    }
  };

  if (items.length === 0 && !isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tu carrito está vacío</h1>
          <p className="text-muted-foreground mb-6">Agrega algunos productos antes de proceder al checkout</p>
        </div>
      </div>
    );
  }

  const orderSummaryProps: OrderSummaryProps = {
    items,
    totalPrice,
    shipping,
    finalTotal,
    isProcessing,
    handleCreatePreference,
    preferenceId,
    isMobile,
    onBack: () => {
      if (step === 3) setStep(2);
      else setStep(1);
    },
    updateQuantity,

    // 👇 NUEVO: feedback de envío
    shippingLoading,
    shippingError,
    shippingSource: shippingQuote?.source ?? null,

    // 👇 NUEVO: navegación de pasos
    step,
    setStep,
    selectedMethod,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Overlay de Redirección */}
      {isRedirecting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="text-center space-y-6 max-w-md px-6">
            <div className="relative w-24 h-24 mx-auto mb-4 bg-white rounded-2xl shadow-lg p-4 flex items-center justify-center border">
              {selectedMethod?.logo_url ? (
                <Image
                  src={selectedMethod.logo_url}
                  alt={selectedMethod.nombre}
                  width={80}
                  height={80}
                  className="object-contain"
                />
              ) : (
                <Shield className="w-12 h-12 text-primary" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Procesando tu pago</h2>
              <p className="text-muted-foreground">Te estamos redirigiendo para completar tu compra.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
              </div>
              <p className="text-xs text-muted-foreground italic">No cierres ni recargues esta ventana</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {isMobile ? (
          step === 1 ? (
            <div className="flex flex-col h=[calc(100vh-112px)]">
              <div className="flex-grow overflow-y-auto pr-2">
                <ShippingForm
                  shippingData={shippingData}
                  setShippingData={setShippingData}
                  isMobile={isMobile}
                  onStepForward={() => setStep(2)}
                />
              </div>
              <div className="flex-shrink-0 pt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Button type="submit" form="shipping-form" className="w-full" size="lg">
                      {shippingData.deliveryMethod === "pickup" ? "Continuar al pago" : "Siguiente: Pago"}
                    </Button>
                    <Link href="/" className="w-full inline-block text-center">
                      <Button className="w-full" size="lg" variant="outline">
                        Volver a la tienda
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-6 pb-20">
              <Card className="border-primary/20 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-2xl">Elegí cómo pagar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PaymentSelector
                    onSelect={(m) => setSelectedMethod(m)}
                    selectedId={selectedMethod?.id}
                  />
                </CardContent>
              </Card>
              <OrderSummary {...orderSummaryProps} onBack={() => setStep(1)} />
            </div>
          ) : (
            null // En mobile no tenemos paso 3 separado por ahora, o lo integramos arriba
          )
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Paso 1: Envío */}
              <div className={cn(step !== 1 && "opacity-50 pointer-events-none")}>
                <Card className={cn(step === 1 ? "border-primary shadow-md" : "border-border")}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                        Información de Envío
                      </span>
                      {step !== 1 && (
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-primary">
                          Editar
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  {step === 1 && (
                    <CardContent className="pt-0">
                      <ShippingForm
                        shippingData={shippingData}
                        setShippingData={setShippingData}
                        isMobile={isMobile}
                        onStepForward={() => setStep(2)}
                      />
                      <div className="mt-6 flex justify-end">
                        <Button type="submit" form="shipping-form" size="lg" className="px-8">
                          Siguiente: Elegir Pago
                        </Button>
                      </div>
                    </CardContent>
                  )}
                  {step !== 1 && (
                    <CardContent className="pb-4 pt-0 text-sm italic text-muted-foreground">
                      {shippingData.deliveryMethod === "pickup" ? "Retiro en tienda" : `${shippingData.address}, ${shippingData.city}`}
                    </CardContent>
                  )}
                </Card>
              </div>

              {/* Paso 2: Pago */}
              <div className={cn(step < 2 && "opacity-50 pointer-events-none", step > 2 && "opacity-50 pointer-events-none")}>
                <Card className={cn(step === 2 ? "border-primary shadow-md" : "border-border")}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                        Medio de Pago
                      </span>
                      {step > 2 && (
                        <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-primary">
                          Editar
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  {step === 2 && (
                    <CardContent className="pt-0">
                      <PaymentSelector
                        onSelect={(m) => setSelectedMethod(m)}
                        selectedId={selectedMethod?.id}
                      />
                      <div className="mt-6 flex justify-between gap-4">
                        <Button variant="outline" onClick={() => setStep(1)}>
                          Volver
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedMethod) setStep(3)
                            else toast({ title: "Seleccioná un medio de pago" })
                          }}
                          disabled={!selectedMethod}
                          className="px-8"
                        >
                          Siguiente: Revisar Pedido
                        </Button>
                      </div>
                    </CardContent>
                  )}
                  {step > 2 && (
                    <CardContent className="pb-4 pt-0 text-sm italic text-muted-foreground">
                      {selectedMethod?.nombre || "No seleccionado"}
                    </CardContent>
                  )}
                </Card>
              </div>

              {/* Paso 3: Revisión Final */}
              {step === 3 && (
                <Card className="border-primary shadow-md bg-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                      Revisión Final
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="text-primary">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-white rounded-md border">
                        <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Cliente</p>
                        <p className="font-medium">{shippingData.firstName} {shippingData.lastName}</p>
                        <p className="text-xs text-muted-foreground">{shippingData.email}</p>
                      </div>
                      <div className="p-3 bg-white rounded-md border">
                        <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Entrega</p>
                        <p className="font-medium">{shippingData.deliveryMethod === 'pickup' ? 'Retiro en tienda' : 'Envio a domicilio'}</p>
                        <p className="text-xs text-muted-foreground truncate">{shippingData.deliveryMethod === 'pickup' ? data.direccion : shippingData.address}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white rounded-md border flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase mb-1">Medio de Pago</p>
                        <p className="font-medium text-lg">{selectedMethod?.nombre}</p>
                      </div>
                      {selectedMethod?.logo_url && (
                        <div className="relative w-12 h-12 bg-gray-50 rounded border p-1">
                          <Image src={selectedMethod.logo_url} alt={selectedMethod.nombre} fill className="object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-100 text-sm">
                      <Shield className="w-4 h-4 flex-shrink-0" />
                      Verificá que tus datos sean correctos antes de confirmar el pago.
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className={cn(isMobile && "h-[calc(100vh-112px)]")}>
              <OrderSummary {...orderSummaryProps} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


