const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/database/pickles.db');

db.all("PRAGMA table_info(orders);", (err, columns) => {
  if (err) {
    console.error('Failed to get table info:', err);
    db.close();
    return;
  }
  const hasPaymentType = columns.some(col => col.name === 'payment_type');
  if (!hasPaymentType) {
    db.run("ALTER TABLE orders ADD COLUMN payment_type TEXT DEFAULT 'cod';", (err) => {
      if (err) {
        console.error('Failed to add payment_type column:', err);
      } else {
        console.log('payment_type column added to orders table.');
      }
    });
  } else {
    console.log('payment_type column already exists.');
  }

  // Add Razorpay columns if not exist
  const hasRazorpayPaymentId = columns.some(col => col.name === 'razorpay_payment_id');
  if (!hasRazorpayPaymentId) {
    db.run("ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT;", (err) => {
      if (err) {
        console.error('Failed to add razorpay_payment_id column:', err);
      } else {
        console.log('razorpay_payment_id column added to orders table.');
      }
    });
  }
  const hasRazorpayOrderId = columns.some(col => col.name === 'razorpay_order_id');
  if (!hasRazorpayOrderId) {
    db.run("ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT;", (err) => {
      if (err) {
        console.error('Failed to add razorpay_order_id column:', err);
      } else {
        console.log('razorpay_order_id column added to orders table.');
      }
    });
  }
  const hasRazorpaySignature = columns.some(col => col.name === 'razorpay_signature');
  if (!hasRazorpaySignature) {
    db.run("ALTER TABLE orders ADD COLUMN razorpay_signature TEXT;", (err) => {
      if (err) {
        console.error('Failed to add razorpay_signature column:', err);
      } else {
        console.log('razorpay_signature column added to orders table.');
      }
    });
  }
  db.close();
}); 