import React from 'react';

const ContactUs = () => (
  <div className="policy-page">
    <h1>Contact Us</h1>
    <p>For any queries, feedback, or support, please contact us:</p>
    <ul>
      <li>Email: <a href="mailto:support@pickles.com">support@pickles.com</a></li>
      <li>Phone: <a href="tel:+911234567890">+91 12345 67890</a></li>
      <li>Address: 123 Pickle Street, Mumbai, India</li>
    </ul>
    <h2>Contact Form</h2>
    <form style={{maxWidth: 400}}>
      <div className="form-group">
        <label>Name</label>
        <input type="text" className="form-input" required />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" className="form-input" required />
      </div>
      <div className="form-group">
        <label>Message</label>
        <textarea className="form-input" rows={4} required />
      </div>
      <button type="submit" className="btn btn-primary">Send</button>
    </form>
  </div>
);

export default ContactUs; 