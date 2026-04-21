"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

import { Product, Subcategory, Size } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox"


interface ProductFormDialogProps {
  subcategories: Subcategory[];
  onSubmit: (data: Omit<Product, 'id' | 'subrubro_nombre'>, items: { talle_id: number; stock: number }[]) => void;
  initialData?: Product | null;
  onOpenChange: (open: boolean) => void;
}

const initialFormData = {
  nombre: '',
  descripcion: '',
  subrubro_id: '',
  precio: 0,
  precio_alternativo: 0,
  moneda: 'ARS' as 'ARS' | 'USD',
  stock: 0,
  image: '',
};

export function ProductFormDialog({ subcategories, onSubmit, initialData, onOpenChange }: ProductFormDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [formData, setFormData] = useState(initialFormData);
  const [isVendible, setIsVendible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [allSizes, setAllSizes] = useState<Size[]>([])
  const [selectedSizeIds, setSelectedSizeIds] = useState<number[]>([])
  const [sizeStocks, setSizeStocks] = useState<Record<number, number>>({})
  const [sizesLoading, setSizesLoading] = useState(true)
  const [productSizesLoading, setProductSizesLoading] = useState(false)
  const isLoading = sizesLoading || productSizesLoading

  useEffect(() => {
    // cargar talles globales
    const loadSizes = async () => {
      try {
        setSizesLoading(true)
        const res = await fetch('/api/sizes')
        const data = await res.json()
        setAllSizes(data)
      } catch (e) {
        console.error(e)
      } finally {
        setSizesLoading(false)
      }
    }
    loadSizes()
  }, [])

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre,
        descripcion: initialData.descripcion,
        subrubro_id: String(initialData.subrubro_id ?? ""),
        precio: initialData.precio,
        stock: initialData.stock,
        image: initialData.image,
        precio_alternativo: initialData.precio_alternativo ?? 0,
        moneda: initialData.moneda ?? 'ARS',
      });
      if (initialData.image) {
        setFileName(initialData.image.split('/').pop() || null);
      }
      setIsVendible(!initialData.exhibicion);
      // cargar talles del producto en edición
      const loadProductSizes = async () => {
        try {
          setProductSizesLoading(true)
          const res = await fetch(`/api/products/${initialData.id}/sizes`)
          const data: Size[] = await res.json()
          setSelectedSizeIds(data.map(s => s.id))
          const stocks: Record<number, number> = {}
          data.forEach(s => { stocks[s.id] = s.stock ?? 0 })
          setSizeStocks(stocks)
        } catch (e) {
          console.error(e)
        } finally {
          setProductSizesLoading(false)
        }
      }
      loadProductSizes()
      setIsOpen(true);
    } else {
      setFormData(initialFormData);
      setFileName(null);
      setSelectedSizeIds([])
      setSizeStocks({})
      setProductSizesLoading(false)
      setIsVendible(false);
    }
  }, [initialData]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange(open);
    if (!open) {
      setFormData(initialFormData);
      setFileName(null);
      setSelectedSizeIds([])
      setSizeStocks({})
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, subrubro_id: value }));
  }

  const handleMonedaChange = (value: 'ARS' | 'USD') => {
    setFormData(prev => ({ ...prev, moneda: value }));
  }

  const toggleSize = (id: number) => {
    setSelectedSizeIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
    setSizeStocks(prev => {
      const next = { ...prev }
      if (!(id in next)) next[id] = 0
      return next
    })
  }

  const applyPreset = (preset: 'helmet' | 'shoe') => {
    const ids = allSizes.filter(s => s.tipo === preset).map(s => s.id)
    setSelectedSizeIds(ids)
    setSizeStocks(prev => {
      const next = { ...prev }
      ids.forEach(id => { if (!(id in next)) next[id] = 0 })
      return next
    })
  }

  const handleSubmit = () => {
    if (!formData.subrubro_id) {
      toast.error("Por favor, selecciona una subcategoría.");
      return;
    }
    const items = selectedSizeIds.map(id => ({ talle_id: id, stock: Number(sizeStocks[id] ?? 0) }))
    const hasSizes = selectedSizeIds.length > 0
    const totalSizeStock = selectedSizeIds.reduce((sum, id) => sum + Number(sizeStocks[id] ?? 0), 0)
    onSubmit({
      ...formData,
      precio: Number(formData.precio) || 0,
      precio_alternativo: Number(formData.precio_alternativo) || 0,
      stock: hasSizes ? totalSizeStock : Number(formData.stock) || 0,
      destacado: false,
      visible: true,
      exhibicion: !isVendible,
    }, items);
    handleOpenChange(false);
  };

  const title = initialData ? "Editar Producto" : "Agregar Nuevo Producto";
  const description = initialData
    ? "Edita la información del producto."
    : "Completa la información del producto que deseas agregar al inventario.";
  const buttonText = initialData ? "Guardar Cambios" : "Agregar Producto";

  const groupedSizes = allSizes.reduce<Record<string, Size[]>>((acc, s) => {
    const key = s.tipo || 'otros'
    acc[key] = acc[key] || []
    acc[key].push(s)
    return acc
  }, {})

  const hasSizes = selectedSizeIds.length > 0
  const totalSizeStock = selectedSizeIds.reduce((sum, id) => sum + Number(sizeStocks[id] ?? 0), 0)

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 ">
              <Label htmlFor="nombre">Nombre del Producto</Label>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subrubro_id">Subcategoría</Label>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="precio">Precio</Label>
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="grid gap-2">
                <Label>Stock</Label>
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="grid gap-2">
              <Label>Talles disponibles</Label>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Skeleton className="h-9 w-32" />
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* {!initialData && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        </DialogTrigger>
      )} */}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 ">
            <Label htmlFor="nombre">Nombre del Producto</Label>
            <Input id="nombre" placeholder="Ej: Casco Integral Premium" value={formData.nombre} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subrubro_id">Subcategoría</Label>
            <Select value={formData.subrubro_id} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una subcategoría" />
              </SelectTrigger>
              <SelectContent>
                {subcategories.map(sub => (
                  <SelectItem key={sub.id} value={String(sub.id)}>{sub.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="precio_alternativo">Precio Transferencia</Label>
              <Input id="precio_alternativo" type="number" placeholder="Ej: 100" value={formData.precio_alternativo} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="precio">Precio Lista</Label>
              <Input id="precio" type="number" placeholder="" value={formData.precio} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="moneda">Moneda</Label>
              <Select value={formData.moneda} onValueChange={handleMonedaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS (Peso Argentino)</SelectItem>
                  <SelectItem value="USD">USD (Dólar Americano)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!hasSizes ? (
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock</Label>
                <Input id="stock" type="number" placeholder="" value={formData.stock} onChange={handleChange} />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Stock total (por talles)</Label>
                <div className="h-10 px-3 flex items-center rounded border bg-muted/50">{totalSizeStock}</div>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" placeholder="Descripción del producto..." value={formData.descripcion} onChange={handleChange} />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch id="vendible-switch" checked={isVendible} onCheckedChange={setIsVendible} />
            <Label htmlFor="vendible-switch" className="cursor-pointer">Para la venta</Label>
          </div>

          {/* Talles */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Talles disponibles</Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('helmet')}>Cascos (S-XL)</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('shoe')}>Calzados (39-46)</Button>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(groupedSizes).map(([tipo, sizes]) => (
                <div key={tipo}>
                  <div className="text-xs font-medium text-muted-foreground mb-2">{tipo.toUpperCase()}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {sizes.map(s => (
                      <div key={s.id} className="flex items-center gap-2 rounded border p-2">
                        <Checkbox checked={selectedSizeIds.includes(s.id)} onCheckedChange={() => toggleSize(s.id)} />
                        <span className="text-sm w-10">{s.nombre}</span>
                        <Input
                          type="number"
                          min={0}
                          value={sizeStocks[s.id] ?? 0}
                          onChange={(e) => setSizeStocks(prev => ({ ...prev, [s.id]: Number(e.target.value || 0) }))}
                          className="h-8"
                          placeholder="Stock"
                          disabled={!selectedSizeIds.includes(s.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={isUploading}>
            {isUploading ? "Espere..." : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}