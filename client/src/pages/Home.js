import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaStar, FaShoppingCart } from 'react-icons/fa';

const Home = () => {
  const [featuredPickles, setFeaturedPickles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedPickles = async () => {
      try {
        const response = await axios.get('/api/pickles?sort=avg_rating&limit=6');
        setFeaturedPickles(response.data.pickles);
      } catch (error) {
        console.error('Failed to fetch featured pickles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedPickles();
  }, []);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FaStar 
          key={i} 
          style={{ color: i <= rating ? '#FFD700' : '#ddd' }} 
        />
      );
    }
    return stars;
  };

  if (loading) {
    return <div className="loading">Loading amazing pickles...</div>;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">🥒 The Best Pickles in Town!</h1>
        <p className="hero-subtitle">
          Discover our handcrafted pickles made with love and traditional recipes. 
          From classic dill to spicy jalapeño, we have the perfect pickle for every taste.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/pickles" className="btn btn-primary">
            <FaShoppingCart /> Shop Now
          </Link>
          <Link to="/register" className="btn btn-outline" style={{ color: 'white', borderColor: 'white' }}>
            Join Our Pickle Family
          </Link>
        </div>
      </section>

      {/* Featured Pickles */}
      <section>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem', color: 'var(--text-color)' }}>
          🌟 Featured Pickles
        </h2>
        
        {featuredPickles.length > 0 ? (
          <div className="grid">
            {featuredPickles.map(pickle => (
              <div key={pickle.id} className="card">
                <img 
                  src={pickle.image_url || 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Pickle'} 
                  alt={pickle.name}
                  className="card-image"
                />
                <div className="card-content">
                  <h3 className="card-title">{pickle.name}</h3>
                  <p className="card-description">{pickle.description}</p>
                  <div className="card-rating">
                    <span className="stars">
                      {renderStars(Math.round(pickle.avg_rating))}
                    </span>
                    <span>({pickle.review_count} reviews)</span>
                  </div>
                  <div className="card-price">${pickle.price}</div>
                  <Link 
                    to={`/pickles/${pickle.id}`} 
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No pickles available at the moment</h3>
            <p>Check back soon for our amazing pickle selection!</p>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section style={{ marginTop: '4rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2rem', color: 'var(--text-color)' }}>
          Why Choose Our Pickles?
        </h2>
        
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌿</div>
            <h3>Natural Ingredients</h3>
            <p>Made with only the finest natural ingredients and traditional recipes passed down through generations.</p>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h3>Fast Delivery</h3>
            <p>Get your favorite pickles delivered to your doorstep within 24 hours of ordering.</p>
          </div>
          
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💚</div>
            <h3>Customer Satisfaction</h3>
            <p>Join thousands of satisfied customers who love our pickles and keep coming back for more.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ 
        marginTop: '4rem', 
        textAlign: 'center', 
        padding: '3rem', 
        background: 'var(--white)', 
        borderRadius: 'var(--border-radius)',
        boxShadow: 'var(--shadow)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>
          Ready to Experience the Best Pickles?
        </h2>
        <p style={{ marginBottom: '2rem', color: 'var(--light-text)' }}>
          Join our pickle community and discover why our customers can't get enough!
        </p>
        <Link to="/pickles" className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '1rem 2rem' }}>
          Start Shopping Now
        </Link>
      </section>
    </div>
  );
};

export default Home; 