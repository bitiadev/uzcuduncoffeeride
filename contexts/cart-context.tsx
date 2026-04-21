"use client"

import type React from "react"
import { createContext, useContext, useReducer, useEffect, useState, useCallback } from "react"
import type { Product, CartItem, CartContextType } from "@/lib/types"

const CartContext = createContext<CartContextType | undefined>(undefined)

type CartAction =
  | { type: "ADD_ITEM"; product: Product; talle_id?: number; talle_nombre?: string }
  | { type: "REMOVE_ITEM"; productId: string; talle_id?: number }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number; talle_id?: number }
  | { type: "CLEAR_CART" }
  | { type: "LOAD_CART"; items: CartItem[] }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingItem = state.find((item) =>
        item.product.id === action.product.id && item.talle_id === action.talle_id
      )
      if (existingItem) {
        return state.map((item) =>
          item.product.id === action.product.id && item.talle_id === action.talle_id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...state, { product: action.product, quantity: 1, talle_id: action.talle_id, talle_nombre: action.talle_nombre }]
    }
    case "REMOVE_ITEM":
      return state.filter((item) => !(item.product.id === action.productId && (action.talle_id == null || item.talle_id === action.talle_id)))
    case "UPDATE_QUANTITY":
      return state.map((item) => (
        item.product.id === action.productId && item.talle_id === action.talle_id
          ? { ...item, quantity: action.quantity }
          : item
      ))
    case "CLEAR_CART":
      return []
    case "LOAD_CART":
      return action.items
    default:
      return state
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [lastItemAddedTimestamp, setLastItemAddedTimestamp] = useState<number | null>(null);
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);


  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("moto-cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        dispatch({ type: "LOAD_CART", items: parsedCart });
      } catch (error) {
        console.error("Error loading cart from localStorage:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem("moto-cart", JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product: Product, options?: { talle_id?: number; talle_nombre?: string }) => {
    dispatch({ type: "ADD_ITEM", product, talle_id: options?.talle_id, talle_nombre: options?.talle_nombre });
    setLastItemAddedTimestamp(Date.now());
  }, []);

  const removeItem = useCallback((productId: string, talle_id?: number) => {
    dispatch({ type: "REMOVE_ITEM", productId, talle_id });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, talle_id?: number) => {
    if (quantity <= 0) {
      const item = items.find(item => item.product.id === productId && item.talle_id === talle_id);
      if (item) {
        setItemToRemove(item);
      }
    } else {
      dispatch({ type: "UPDATE_QUANTITY", productId, quantity, talle_id });
    }
  }, [items]);

  const confirmRemoveItem = useCallback(() => {
    if (itemToRemove) {
      dispatch({ type: "REMOVE_ITEM", productId: itemToRemove.product.id, talle_id: itemToRemove.talle_id });
      setItemToRemove(null);
    }
  }, [itemToRemove]);

  const cancelRemoveItem = useCallback(() => {
    if (itemToRemove) {
      dispatch({ type: "UPDATE_QUANTITY", productId: itemToRemove.product.id, quantity: 1, talle_id: itemToRemove.talle_id });
      setItemToRemove(null);
    }
  }, [itemToRemove]);


  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce(
      (total, item) => total + item.product.precio * item.quantity,
      0
    );
  };

  const value: CartContextType = {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalItems,
    getTotalPrice,
    lastItemAddedTimestamp,
    setLastItemAddedTimestamp,
    itemToRemove,
    confirmRemoveItem,
    cancelRemoveItem,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
