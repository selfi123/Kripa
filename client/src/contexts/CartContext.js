import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper: Save cart to localStorage
  const saveLocalCart = (cartItems) => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  };

  // Helper: Load cart from localStorage
  const loadLocalCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        return JSON.parse(savedCart);
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
    return [];
  };

  // Load cart on mount (local for guests, server for logged-in)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    if (isAuthenticated) {
      // Fetch server cart
      setLoading(true);
      axios.get('/api/cart')
        .then(res => {
          setCart(res.data.items || []);
        })
        .catch(() => setCart([]))
        .finally(() => setLoading(false));
    } else {
      setCart(loadLocalCart());
    }
  }, [isAuthenticated, authLoading]);

  // Save cart to localStorage if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      saveLocalCart(cart);
    }
  }, [cart, isAuthenticated]);

  // Merge local cart with server cart on login
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      const localCart = loadLocalCart();
      if (localCart.length > 0) {
        // Fetch server cart, merge, and save
        axios.get('/api/cart').then(res => {
          const serverCart = res.data.items || [];
          // Merge: sum quantities for same pickleId
          const merged = [...serverCart];
          localCart.forEach(localItem => {
            const idx = merged.findIndex(item => item.id === localItem.id);
            if (idx !== -1) {
              merged[idx].quantity += localItem.quantity;
            } else {
              merged.push(localItem);
            }
          });
          setCart(merged);
          axios.post('/api/cart', { items: merged });
          localStorage.removeItem('cart');
        });
      }
    }
  }, [isAuthenticated, authLoading]);

  // Cart actions
  const syncServerCart = (newCart) => {
    if (isAuthenticated) {
      setCart(newCart);
      axios.post('/api/cart', { items: newCart });
    } else {
      setCart(newCart);
    }
  };

  const addToCart = (pickle, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === pickle.id);
      toast.dismiss();
      let updatedCart;
      if (existingItem) {
        updatedCart = prevCart.map(item =>
          item.id === pickle.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        toast.success(`Updated ${pickle.name} quantity!`);
      } else {
        const newItem = {
          id: pickle.id,
          name: pickle.name,
          price: pickle.price,
          imageUrl: pickle.image_url,
          quantity
        };
        updatedCart = [...prevCart, newItem];
        toast.success(`Added ${pickle.name} to cart!`);
      }
      syncServerCart(updatedCart);
      return updatedCart;
    });
  };

  const removeFromCart = (pickleId) => {
    setCart(prevCart => {
      const item = prevCart.find(item => item.id === pickleId);
      toast.dismiss();
      let updatedCart = prevCart.filter(item => item.id !== pickleId);
      if (item) {
        toast.info(`Removed ${item.name} from cart`);
      }
      syncServerCart(updatedCart);
      return updatedCart;
    });
  };

  const updateQuantity = (pickleId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(pickleId);
      return;
    }
    toast.dismiss();
    setCart(prevCart => {
      const updatedCart = prevCart.map(item =>
        item.id === pickleId
          ? { ...item, quantity }
          : item
      );
      syncServerCart(updatedCart);
      return updatedCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    toast.dismiss();
    toast.info('Cart cleared!');
    if (isAuthenticated) {
      axios.delete('/api/cart');
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getCartItems = () => {
    return cart.map(item => ({
      pickleId: item.id,
      quantity: item.quantity,
      price: item.price
    }));
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemCount,
    getCartItems,
    isEmpty: cart.length === 0,
    loading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 