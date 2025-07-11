import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
          // No toast here (silent)
        } catch (error) {
          console.error('Auth check failed:', error);
          logout(true); // silent logout
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (emailOrToken, password, silent = false) => {
    try {
      // If only one parameter is provided, it's a token from OAuth
      if (!password) {
        const token = emailOrToken;
        localStorage.setItem('token', token);
        setToken(token);
        const response = await axios.get('/api/auth/profile');
        setUser(response.data.user);
        if (!silent) toast.success('Login successful!');
        return { success: true };
      }
      // Regular email/password login
      const response = await axios.post('/api/auth/login', { email: emailOrToken, password });
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      if (!silent) toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      // Detect unverified error
      if (message.toLowerCase().includes('verify your email')) {
        if (!silent) toast.error(message);
        return { success: false, error: message, unverified: true };
      }
      if (!silent) toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });
      // Always show verification message, do not auto-login
      toast.success('Registration successful! Please check your email to verify your account.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Resend verification email
  const resendVerificationEmail = async (email) => {
    try {
      await axios.post('/api/auth/resend-verification', { email });
      toast.success('Verification email resent! Please check your inbox.');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to resend verification email.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = (silent = false) => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    if (!silent) toast.info('Logged out successfully');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    resendVerificationEmail,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 