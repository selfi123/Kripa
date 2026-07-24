require('dotenv').config();
const pool = require('../db/pool');

async function run() {
    const { rowCount } = await pool.query(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING`,
        ['KRIPA10', 'percent', 10, 500]
    );
    if (rowCount > 0) {
        console.log('✅ Coupon KRIPA10 created! 10% off on orders ₹500+');
    } else {
        console.log('ℹ️  Coupon KRIPA10 already exists (skipped).');
    }
    await pool.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
