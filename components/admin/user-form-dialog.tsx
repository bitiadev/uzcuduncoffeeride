"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import type { User, Rol } from "@/lib/types"


interface UserFormDialogProps {
  roles: Rol[];
  onSubmit: (data: Omit<User, 'id'>) => void;
  initialData?: User | null;
  onOpenChange: (open: boolean) => void;
}

const initialFormData = {
    nombre: '',
    email: '',
    apellido: '',
    rol_id: '',
    rol_name: '',
    pass: '',
};

export function UserFormDialog({ roles, onSubmit, initialData, onOpenChange }: UserFormDialogProps) {
  const [isOpen, setIsOpen] = useState(!!initialData);
  const [formData, setFormData] = useState<typeof initialFormData | any>(initialFormData);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        nombre: initialData.nombre,
        apellido: initialData.apellido,
        rol_id: String(initialData.rol_id ?? ""),
        email: initialData.email,
        rol_name: initialData.rol_name ?? "",
        pass: initialData.pass,
      });
      setIsOpen(true);
    } else {
      setFormData(initialFormData);
    }
  }, [initialData]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange(open);
    if (!open) {
      setFormData(initialFormData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev: typeof initialFormData) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev: typeof initialFormData) => ({ ...prev, rol_id: value }));
  }

  const handleSubmit = () => {
  
    if (!formData.rol_id) {
        toast.error("Por favor, selecciona un rol.");
        return;
    }
    onSubmit({
      ...formData,
      rol_id: Number(formData.rol_id),
    });
    handleOpenChange(false);
  };

  const title = initialData ? "Editar Usuario" : "Agregar Nuevo Usuario";
  const description = initialData
    ? "Edita la información del usuario."
    : "Completa la información del usuario que deseas agregar.";
  const buttonText = initialData ? "Guardar Cambios" : "Agregar Usuario";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!initialData && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Usuario
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 ">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="Ej: uzcudun@coffeeride.com" value={formData.email} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pass">Contraseña</Label>
            <Input id="pass" type="password" placeholder="Ingrese su contraseña" value={formData.pass || ''} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subrubro_id">Rol</Label>
            <Select value={formData.rol_id} onValueChange={handleSelectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(sub => (
                  <SelectItem key={sub.id} value={String(sub.id)}>{sub.descripcion}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" type="text" placeholder="Ingrese su nombre" value={formData.nombre} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apellido">Apellido</Label>
              <Input id="apellido" type="string" placeholder="Ingrese su apellido" value={formData.apellido} onChange={handleChange} />
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