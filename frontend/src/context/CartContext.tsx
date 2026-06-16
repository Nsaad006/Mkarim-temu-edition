import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Product } from '@/data/products';

export interface CartItem {
    product: Product;
    quantity: number;
    selectedVariants?: Record<string, string>; // e.g. { "Couleur": "Rouge", "Taille": "M" }
    variantImage?: string; // URL of the image linked to the selected variant option
}

interface CartState {
    items: CartItem[];
}

type CartAction =
    | { type: 'ADD_ITEM'; product: Product; quantity?: number; selectedVariants?: Record<string, string>; variantImage?: string }
    | { type: 'REMOVE_ITEM'; productId: string }
    | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
    | { type: 'CLEAR_CART' }
    | { type: 'LOAD_CART'; items: CartItem[] };

interface CartContextType {
    state: CartState;
    addItem: (product: Product, quantity?: number, selectedVariants?: Record<string, string>, variantImage?: string) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
    lastAddedTime: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mkarim-cart';

function cartReducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case 'ADD_ITEM': {
            const addedQty = action.quantity || 1;
            // If variants selected, treat as distinct item (different variant = different cart entry)
            const variantKey = action.selectedVariants ? JSON.stringify(action.selectedVariants) : '';
            const existingItemIndex = state.items.findIndex(
                (item) => item.product.id === action.product.id &&
                    JSON.stringify(item.selectedVariants || {}) === JSON.stringify(action.selectedVariants || {})
            );

            if (existingItemIndex > -1) {
                const newItems = JSON.parse(JSON.stringify(state.items));
                newItems[existingItemIndex].quantity += addedQty;
                return { items: newItems };
            }

            return {
                items: [...state.items, { product: action.product, quantity: addedQty, selectedVariants: action.selectedVariants, variantImage: action.variantImage }],
            };
        }

        case 'REMOVE_ITEM':
            return {
                items: state.items.filter((item) => item.product.id !== action.productId),
            };

        case 'UPDATE_QUANTITY':
            return {
                items: state.items.map((item) =>
                    item.product.id === action.productId
                        ? { ...item, quantity: Math.max(1, action.quantity) }
                        : item
                ),
            };

        case 'CLEAR_CART':
            return { items: [] };

        case 'LOAD_CART':
            return { items: action.items };

        default:
            return state;
    }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(cartReducer, { items: [] });
    const [lastAddedTime, setLastAddedTime] = React.useState(0);

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
            try {
                const items = JSON.parse(savedCart);
                dispatch({ type: 'LOAD_CART', items });
            } catch (error) {
                console.error('Failed to load cart from localStorage:', error);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.items));
    }, [state.items]);

    const addItem = (product: Product, quantity?: number, selectedVariants?: Record<string, string>, variantImage?: string) => {
        dispatch({ type: 'ADD_ITEM', product, quantity, selectedVariants, variantImage });
        setLastAddedTime(Date.now());
    };

    const removeItem = (productId: string) => {
        dispatch({ type: 'REMOVE_ITEM', productId });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        dispatch({ type: 'UPDATE_QUANTITY', productId, quantity });
    };

    const clearCart = () => {
        dispatch({ type: 'CLEAR_CART' });
    };

    const getTotal = () => {
        return state.items.reduce((total, item) => total + item.product.price * item.quantity, 0);
    };

    const getItemCount = () => {
        return state.items.reduce((count, item) => count + item.quantity, 0);
    };

    return (
        <CartContext.Provider
            value={{
                state,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                getTotal,
                getItemCount,
                lastAddedTime,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
