import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { getCartItemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🥒 Awesome Pickles
        </Link>
        
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
          >
            Home
          </Link>
          
          <Link 
            to="/pickles" 
            className={`nav-link ${isActive('/pickles') ? 'active' : ''}`}
          >
            Pickles
          </Link>
          
          {isAuthenticated && (
            <Link 
              to="/orders" 
              className={`nav-link ${isActive('/orders') ? 'active' : ''}`}
            >
              My Orders
            </Link>
          )}
          
          {isAdmin && (
            <Link 
              to="/admin" 
              className={`nav-link ${isActive('/admin') ? 'active' : ''}`}
            >
              <FaCog /> Admin
            </Link>
          )}
          
          <Link to="/cart" className="nav-link cart-icon">
            <FaShoppingCart />
            {getCartItemCount() > 0 && (
              <span className="cart-badge">{getCartItemCount()}</span>
            )}
          </Link>
          
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>
                <FaUser /> {user?.username}
              </span>
              <button 
                onClick={handleLogout}
                className="btn btn-outline btn-small"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FaSignOutAlt /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/login" className="btn btn-outline btn-small">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-small">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 