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
      db.close();
    });
  } else {
    console.log('payment_type column already exists.');
    db.close();
  }
}); 