import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (pickle, quantity = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === pickle.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        const updatedCart = prevCart.map(item =>
          item.id === pickle.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        toast.success(`Updated ${pickle.name} quantity!`);
        return updatedCart;
      } else {
        // Add new item
        const newItem = {
          id: pickle.id,
          name: pickle.name,
          price: pickle.price,
          imageUrl: pickle.image_url,
          quantity
        };
        toast.success(`Added ${pickle.name} to cart!`);
        return [...prevCart, newItem];
      }
    });
  };

  const removeFromCart = (pickleId) => {
    setCart(prevCart => {
      const item = prevCart.find(item => item.id === pickleId);
      if (item) {
        toast.info(`Removed ${item.name} from cart`);
      }
      return prevCart.filter(item => item.id !== pickleId);
    });
  };

  const updateQuantity = (pickleId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(pickleId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === pickleId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Cart cleared!');
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
    isEmpty: cart.length === 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}; 