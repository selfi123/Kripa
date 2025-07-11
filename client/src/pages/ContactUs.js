import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ContactUs = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/contact', form);
      toast.success('Message sent! We will get back to you soon.');
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="policy-page animated">
      <h1 className="animated">Contact Kripa Pickles</h1>
      <p>For any queries, feedback, or support, please contact us:</p>
      <ul>
        <li>Email: <a href="mailto:kripapicklestore@gmail.com">kripapicklestore@gmail.com</a></li>
        <li>Phone: <a href="tel:+919847406948">+91 98474 06948</a></li>
        <li>Address: 123 Pickle Street, Mumbai, India</li>
      </ul>
      <h2 className="animated">Contact Form</h2>
      <form style={{maxWidth: 400}} className="animated" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input type="text" className="form-input" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" className="form-input" name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label>Message</label>
          <textarea className="form-input" name="message" rows={4} value={form.message} onChange={handleChange} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Sending...' : 'Send'}</button>
      </form>
    </div>
  );
};

export default ContactUs; 