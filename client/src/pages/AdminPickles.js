import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const initialForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock: '',
  image_url: ''
};

const AdminPickles = () => {
  const { isAdmin } = useAuth();
  const [pickles, setPickles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (isAdmin) fetchPickles();
  }, [isAdmin]);

  const fetchPickles = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/pickles');
      setPickles(res.data.pickles);
    } catch (err) {
      toast.error('Failed to fetch pickles');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddOrEdit = async (e) => {
    e.preventDefault();
    const data = {
      ...form,
      price: parseFloat(form.price),
      stock: parseInt(form.stock) || 0,
      imageUrl: form.image_url
    };
    setUpdating((prev) => ({ ...prev, add: true }));
    try {
      if (editingId) {
        await axios.put(`/api/admin/pickles/${editingId}`, data);
        toast.success('Pickle updated!');
      } else {
        await axios.post('/api/admin/pickles', data);
        toast.success('Pickle added!');
      }
      setForm(initialForm);
      setEditingId(null);
      fetchPickles();
    } catch (err) {
      toast.error('Failed to save pickle');
    } finally {
      setUpdating((prev) => ({ ...prev, add: false }));
    }
  };

  const handleEdit = (pickle) => {
    setForm({
      name: pickle.name,
      description: pickle.description,
      price: pickle.price,
      category: pickle.category,
      stock: pickle.stock,
      image_url: pickle.image_url
    });
    setEditingId(pickle.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pickle?')) return;
    setUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      await axios.delete(`/api/admin/pickles/${id}`);
      setPickles((prev) => prev.filter(p => p.id !== id));
      toast.success('Pickle deleted!');
    } catch (err) {
      toast.error('Failed to delete pickle');
    } finally {
      setUpdating((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <h3>Access Denied</h3>
        <p>You need admin privileges to view this page.</p>
        <Link to="/" className="btn btn-primary">
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem', color: 'var(--text-color)' }}>
        🥒 Manage Pickles
      </h1>
      {/* Add/Edit Form */}
      <div style={{ background: 'var(--white)', padding: '2rem', borderRadius: 8, marginBottom: '2rem', boxShadow: 'var(--shadow)' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>{editingId ? 'Edit Pickle' : 'Add New Pickle'}</h2>
        <form onSubmit={handleAddOrEdit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <input name="name" value={form.name} onChange={handleInputChange} placeholder="Name" required className="form-input" />
          <input name="category" value={form.category} onChange={handleInputChange} placeholder="Category" className="form-input" />
          <input name="price" value={form.price} onChange={handleInputChange} placeholder="Price" type="number" min="0" step="0.01" required className="form-input" />
          <input name="stock" value={form.stock} onChange={handleInputChange} placeholder="Stock" type="number" min="0" className="form-input" />
          <input name="image_url" value={form.image_url} onChange={handleInputChange} placeholder="Image URL" className="form-input" />
          <textarea name="description" value={form.description} onChange={handleInputChange} placeholder="Description" rows={2} className="form-input" style={{ gridColumn: '1/-1' }} />
          <div style={{ gridColumn: '1/-1', textAlign: 'right' }}>
            {editingId && (
              <button type="button" className="btn btn-outline" style={{ marginRight: 8 }} onClick={() => { setForm(initialForm); setEditingId(null); }}>Cancel</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={updating.add}>{editingId ? 'Update' : 'Add'} Pickle</button>
          </div>
        </form>
      </div>
      {/* Pickles Table */}
      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Image</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pickles.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>₹{Number(p.price).toFixed(2)}</td>
                <td>{p.stock}</td>
                <td>{p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : '—'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline btn-small" onClick={() => handleEdit(p)} disabled={updating[p.id]}>Edit</button>
                  <button className="btn btn-outline btn-small" style={{ color: 'red', borderColor: 'red' }} onClick={() => handleDelete(p.id)} disabled={updating[p.id]}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/admin" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default AdminPickles; 