"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserFormDialog } from "@/components/admin/user-form-dialog"
import { UsersTable } from "@/components/admin/users-table"
import type { User, Rol } from "@/lib/types"


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setErrorDialog({ isOpen: true, message: 'No se pudieron cargar los usuarios.' });
    }
  };

  const fetchRol = async () => {
    try {
      const res = await fetch('/api/rol');
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error(error);
      setErrorDialog({ isOpen: true, message: 'No se pudieron cargar los roles.' });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRol();
  }, []);

  const handleAddUser = async (data: Omit<User, 'id' | 'rol_name'>) => { 
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchUsers(); // Refetch to get the full product data with subcategory name
    } else {
      const errorData = await response.json();
      setErrorDialog({ isOpen: true, message: errorData.message || 'Error al crear el usuario.' });
    }
  };

  const handleUpdateUser = async (id: number, data: Omit<User, 'id' | 'rol_name'>) => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      await fetchUsers(); // Refetch to get updated data
      setEditingUser(null);
    } else {
      const errorData = await response.json();
      setErrorDialog({ isOpen: true, message: errorData.message || 'Error al actualizar el usuario.' });
    }
  };

  const handleDeleteUser = async (id: number) => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setUsers(users.filter(p => p.id !== id));
    } else {
      const errorData = await response.json();
      setErrorDialog({ isOpen: true, message: errorData.message || 'Ocurrió un error al eliminar el usuario.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
          <p className="text-muted-foreground">
            Gestiona los usuarios que pueden acceder al panel de administración
          </p>
        </div>
        <UserFormDialog
          key={editingUser ? 'edit' : 'add'} // Reset form when switching between add/edit
          roles={roles}
          onSubmit={editingUser ? (data) => handleUpdateUser(editingUser.id as number, data) : handleAddUser}
          initialData={editingUser}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingUser(null);
          }}
        />
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuario ({users.length})</CardTitle>
          <CardDescription>Gestiona todos tus usuarios desde esta vista</CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={users}
            onEdit={setEditingUser}
            onDelete={handleDeleteUser}
          />
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.isOpen} onOpenChange={(open) => setErrorDialog({ ...errorDialog, isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
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
