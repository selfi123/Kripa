import React from 'react';

const ContactUs = () => (
  <div className="policy-page animated">
    <h1 className="animated">Contact Kripa Pickles</h1>
    <p>For any queries, feedback, or support, please contact us:</p>
    <ul>
      <li>Email: <a href="mailto:kripapicklestore@gmail.com">kripapicklestore@gmail.com</a></li>
      <li>Phone: <a href="tel:+919847406948">+91 98474 06948</a></li>
      <li>Address: 123 Pickle Street, Mumbai, India</li>
    </ul>
    <h2 className="animated">Contact Form</h2>
    <form style={{maxWidth: 400}} className="animated">
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