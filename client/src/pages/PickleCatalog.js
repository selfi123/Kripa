import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaStar, FaSearch, FaFilter } from 'react-icons/fa';

const PickleCatalog = () => {
  const [pickles, setPickles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sort: 'name'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [picklesResponse, categoriesResponse] = await Promise.all([
          axios.get('/api/pickles'),
          axios.get('/api/pickles/categories/all')
        ]);
        
        setPickles(picklesResponse.data.pickles);
        setCategories(categoriesResponse.data.categories);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchPickles = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.append('search', filters.search);
        if (filters.category) params.append('category', filters.category);
        if (filters.sort) params.append('sort', filters.sort);
        
        const response = await axios.get(`/api/pickles?${params.toString()}`);
        setPickles(response.data.pickles);
      } catch (error) {
        console.error('Failed to fetch pickles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPickles();
  }, [filters]);

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
    return <div className="loading animated">Loading Kripa Pickles...</div>;
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }} className="animated">
        🥒 Explore the Kripa Pickles Collection
      </h1>

      {/* Filters */}
      <div style={{ 
        background: 'var(--white)', 
        padding: '2rem', 
        borderRadius: 'var(--border-radius)', 
        marginBottom: '2rem',
        boxShadow: 'var(--shadow)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <FaSearch style={{ color: 'var(--light-text)' }} />
          <h3 style={{ margin: 0, color: 'var(--text-color)' }}>Search & Filter</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="form-label">Search Pickles</label>
            <input
              type="text"
              placeholder="Search by name or description..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="form-input"
            />
          </div>
          
          <div>
            <label className="form-label">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="form-input"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="form-label">Sort By</label>
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
              className="form-input"
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="avg_rating">Rating</option>
              <option value="created_at">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div style={{ marginBottom: '2rem', color: 'var(--light-text)' }}>
        {pickles.length > 0 ? (
          <p>Found {pickles.length} delicious Kripa Pickle{pickles.length !== 1 ? 's' : ''}!</p>
        ) : (
          <p>No pickles found matching your criteria.</p>
        )}
      </div>

      {/* Pickles Grid */}
      {pickles.length > 0 ? (
        <div className="grid animated">
          {pickles.map(pickle => (
            <div key={pickle.id} className="card">
              <img 
                src={pickle.image_url || 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Pickle'} 
                alt={pickle.name}
                className="card-image"
              />
              <div className="card-content">
                <h3 className="card-title">{pickle.name}</h3>
                <p className="card-description">{pickle.description}</p>
                
                {pickle.category && (
                  <div style={{ 
                    display: 'inline-block', 
                    background: 'var(--secondary-color)', 
                    color: 'white', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: 'var(--border-radius)', 
                    fontSize: '0.875rem',
                    marginBottom: '1rem'
                  }}>
                    {pickle.category}
                  </div>
                )}
                
                <div className="card-rating">
                  <span className="stars">
                    {renderStars(Math.round(pickle.avg_rating))}
                  </span>
                  <span>({pickle.review_count} reviews)</span>
                </div>
                
                <div className="card-price">₹{pickle.price}</div>
                
                {pickle.stock > 0 ? (
                  <div style={{ color: 'var(--primary-color)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ✓ In Stock ({pickle.stock} available)
                  </div>
                ) : (
                  <div style={{ color: '#f44336', marginBottom: '1rem', fontSize: '0.875rem' }}>
                    ✗ Out of Stock
                  </div>
                )}
                
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
        <div className="empty-state animated">
          <h3>No pickles found</h3>
          <p>Try adjusting your search criteria or check back later for new arrivals!</p>
        </div>
      )}
    </div>
  );
};

export default PickleCatalog; 