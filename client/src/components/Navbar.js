import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaCog } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

function Footer() {
  return (
    <footer style={{
      position: 'fixed',
      left: 0,
      bottom: 0,
      width: '100%',
      background: '#f8f8f8',
      borderTop: '1px solid #e0e0e0',
      padding: '0.75rem 0 0.5rem 0',
      textAlign: 'center',
      fontSize: '1rem',
      color: '#555',
      zIndex: 1000,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{ marginBottom: '0.25rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <Link to="/contact-us">Contact Us</Link>
        <Link to="/shipping-policy">Shipping Policy</Link>
        <Link to="/terms-and-conditions">Terms & Conditions</Link>
        <Link to="/cancellations-refunds">Cancellations & Refunds</Link>
        <Link to="/privacy-policy">Privacy Policy</Link>
      </div>
      <div style={{ fontSize: '0.95rem', color: '#888' }}>© {new Date().getFullYear()} Kripa Pickles. All rights reserved.</div>
    </footer>
  );
}

const logoStyle = {
  fontSize: '1.7rem',
  fontWeight: 'bold',
  color: 'var(--primary-color)',
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  transition: 'transform 0.3s cubic-bezier(.68,-0.55,.27,1.55)',
  cursor: 'pointer',
  animation: 'logo-bounce 1.2s infinite alternate',
};

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
        <Link to="/" className="nav-logo" style={logoStyle} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08) rotate(-3deg)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
          <span role="img" aria-label="lemon" style={{ fontSize: '2rem', animation: 'spin 2s linear infinite' }}>🍋</span> Kripa Pickles
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

export default function NavbarWithFooter(props) {
  return (
    <>
      <Navbar {...props} />
      <Footer />
    </>
  );
} 