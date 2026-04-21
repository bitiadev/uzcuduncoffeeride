'use client'

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryFormDialog } from "@/components/admin/category-form-dialog"
import { SubcategoryFormDialog } from "@/components/admin/subcategory-form-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ChevronDown, ChevronRight, Trash2, Pencil } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Category, Subcategory } from "@/lib/types"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data);
  };

  const fetchSubcategories = async (rubroId: string) => {
    const res = await fetch(`/api/subcategories?rubroId=${rubroId}`);
    const data = await res.json();
    setCategories(prevCategories => {
      return prevCategories.map(category => {
        if (category.id === rubroId) {
          return { ...category, subcategories: data };
        }
        return category;
      });
    });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (data: { name: string }) => {
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre: data.name }),
    });

    const newCategory = await response.json();
    if (response.ok) {
      setCategories([...categories, newCategory]);
    } else {
      setErrorDialog({ isOpen: true, message: newCategory.message || 'Ocurrió un error al agregar la categoría.' });
    }
    //setCategories([...categories, newCategory]);
  };

  const handleUpdateCategory = async (id: string, data: { name: string }) => {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre: data.name }),
    });
    const updatedCategory = await response.json();
    setCategories(categories.map(c => c.id === id ? { ...c, ...updatedCategory } : c));
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (id: string) => {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setCategories(categories.filter(c => c.id !== id));
    } else {
      const errorData = await response.json();
      setErrorDialog({ isOpen: true, message: errorData.message || 'Ocurrió un error al eliminar la categoría.' });
    }
  };

  const handleAddSubcategory = async (data: { name: string, rubro_id: string }) => {
    const response = await fetch('/api/subcategories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre: data.name, rubro_id: data.rubro_id }),
    });
    const newSubcategory = await response.json();
    fetchSubcategories(newSubcategory.rubro_id);
  };

  const handleUpdateSubcategory = async (id: string, rubro_id: string, data: { name: string }) => {
    const response = await fetch(`/api/subcategories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nombre: data.name }),
    });
    fetchSubcategories(rubro_id);
    setEditingSubcategory(null);
  };

  const handleDeleteSubcategory = async (id: string, rubro_id: string) => {
    await fetch(`/api/subcategories/${id}`, {
      method: 'DELETE',
    });
    fetchSubcategories(rubro_id);
  };

  const toggleRow = (id: string) => {
    setOpenRows(prev => ({ ...prev, [id]: !prev[id] }));
    if (!openRows[id]) {
      fetchSubcategories(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Categorías</h2>
          <p className="text-muted-foreground">
            Gestiona las categorías y subcategorías de tus productos.
          </p>
        </div>
        <div className="w-full flex justify-end md:w-auto">
          <CategoryFormDialog onSubmit={handleAddCategory} />
        </div>
      </div>

      {/* Categories table */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Categorías ({categories.length})</CardTitle>
            <CardDescription>Gestiona todas tus categorías desde esta vista</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <React.Fragment key={category.id}>
                    <TableRow>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => toggleRow(category.id)}>
                          {openRows[category.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{category.nombre}</TableCell>
                      <TableCell className="text-right">
                        <SubcategoryFormDialog onSubmit={handleAddSubcategory} rubroId={category.id} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {openRows[category.id] && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <div className="pl-10 pr-4 py-2">
                            {category.subcategories && category.subcategories.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Subcategorias</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {category.subcategories.map(subcategory => (
                                    <TableRow key={subcategory.id}>
                                      <TableCell>{subcategory.nombre}</TableCell>
                                      <TableCell className="text-right">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                              <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => setEditingSubcategory(subcategory)}>
                                              <Pencil className="w-4 h-4 mr-2" />
                                              Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDeleteSubcategory(subcategory.id, subcategory.rubro_id!)}>
                                              <Trash2 className="w-4 h-4 mr-2" />
                                              Eliminar
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground">No hay subcategorías para esta categoría.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {editingCategory && (
        <CategoryFormDialog
          initialData={editingCategory}
          onSubmit={(data) => handleUpdateCategory(editingCategory.id, data)}
          onOpenChange={() => setEditingCategory(null)}
        />
      )}
      {editingSubcategory && (
        <SubcategoryFormDialog
          initialData={editingSubcategory}
          rubroId={editingSubcategory.rubro_id!}
          onSubmit={(data) => handleUpdateSubcategory(editingSubcategory.id, editingSubcategory.rubro_id!, data)}
          onOpenChange={() => setEditingSubcategory(null)}
        />
      )}

      <AlertDialog open={errorDialog.isOpen} onOpenChange={(open) => setErrorDialog({ ...errorDialog, isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error al Eliminar</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorDialog({ isOpen: false, message: '' })}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}