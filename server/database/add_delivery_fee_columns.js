const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'pickles.db');
const db = new sqlite3.Database(dbPath);

const addDeliveryFeeColumns = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if columns already exist
      db.get("PRAGMA table_info(orders)", (err, rows) => {
        if (err) {
          console.error('Error checking table structure:', err);
          reject(err);
          return;
        }
        
        // Add delivery_fee column if it doesn't exist
        db.run("ALTER TABLE orders ADD COLUMN delivery_fee REAL DEFAULT 0", (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding delivery_fee column:', err);
          } else {
            console.log('✓ delivery_fee column added or already exists');
          }
          
          // Add delivery_type column if it doesn't exist
          db.run("ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'standard'", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Error adding delivery_type column:', err);
            } else {
              console.log('✓ delivery_type column added or already exists');
            }
            
            console.log('✓ Delivery fee columns migration completed');
            resolve();
          });
        });
      });
    });
  });
};

// Run the migration
addDeliveryFeeColumns()
  .then(() => {
    console.log('Database migration completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  }); 