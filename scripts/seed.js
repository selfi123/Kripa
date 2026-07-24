/**
 * scripts/seed.js
 * Reads all images from categoriess/ folder and stores them as base64
 * data URLs directly in PostgreSQL — so images persist on Render.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');

const categoriesDir = path.join(__dirname, '..', 'categoriess');

const priceRanges = {
    'Mango Pickle': [99, 299],
    'Garlic Pickle': [149, 349],
    'Mixed Pickle': [129, 299],
    'Lemon Pickle': [99, 199],
    'Chilli Pickle': [149, 249]
};

const descriptions = {
    'Mango Pickle': 'Authentic home-style spicy mango pickle, aged to perfection.',
    'Garlic Pickle': 'Premium garlic cloves pickled with aromatic spices.',
    'Mixed Pickle': 'A delightful mix of fresh vegetables pickled in traditional spices.',
    'Lemon Pickle': 'Tangy and sweet lemon pickle, a perfect side for every meal.',
    'Chilli Pickle': 'Spicy green chilli pickle for those who love an extra kick.'
};

const suffixes = ['Spicy', 'Sweet', 'Tangy', 'Premium', 'Home-style', 'Extra Hot', 'Authentic', 'Special'];

function randomPrice([min, max]) {
    return Math.round((Math.floor(Math.random() * (max - min + 1)) + min) / 99) * 99 + 99;
}
function productName(cat, idx) {
    const word = cat.replace(/[^a-zA-Z ]/g, '').trim().split(' ').pop();
    return `KRIPA ${word} – ${suffixes[idx % suffixes.length]} Edition`;
}
function fileToBase64(filePath) {
    try {
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase().replace('.', '');
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
            ext === 'png' ? 'image/png' :
                ext === 'webp' ? 'image/webp' : 'image/jpeg';
        return `data:${mime};base64,${buf.toString('base64')}`;
    } catch { return null; }
}
function collectImages(dir, depth = 0) {
    if (depth > 3) return [];
    let imgs = [];
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) imgs = imgs.concat(collectImages(full, depth + 1));
        else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(f)) imgs.push(full);
    }
    return imgs;
}

async function seed() {
    const client = await pool.connect();
    try {
        // Ensure tables
        await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
        await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT, cover_data TEXT, cover_name VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(500) NOT NULL, category VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0, description TEXT,
        images JSONB NOT NULL DEFAULT '[]', featured BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

        const catDirs = fs.readdirSync(categoriesDir).filter(f =>
            fs.statSync(path.join(categoriesDir, f)).isDirectory()
        );

        let insertedProducts = 0;
        let insertedCats = 0;

        for (const cat of catDirs) {
            const catDir = path.join(categoriesDir, cat);
            const allImages = collectImages(catDir);
            if (!allImages.length) continue;

            const coverData = fileToBase64(allImages[0]);

            // Upsert category with cover image
            const catRes = await client.query(
                `INSERT INTO categories (name, description, cover_data, cover_name)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           cover_data = CASE WHEN categories.cover_data IS NULL THEN EXCLUDED.cover_data ELSE categories.cover_data END
         RETURNING id, name`,
                [cat, descriptions[cat] || cat, coverData, path.basename(allImages[0])]
            );
            if (catRes.rows[0]) insertedCats++;

            // Group images into products (2 images per product)
            let idx = 0;
            for (let i = 0; i < allImages.length;) {
                const take = Math.min(2, allImages.length - i);
                const imgData = [];
                for (let j = 0; j < take; j++, i++) {
                    const b64 = fileToBase64(allImages[i]);
                    if (b64) imgData.push(b64);
                }
                if (!imgData.length) continue;

                const name = productName(cat, idx);
                const price = randomPrice(priceRanges[cat] || [999, 2499]);
                const featured = idx === 0;

                // Check by name to avoid duplicates
                const exists = await client.query(`SELECT 1 FROM products WHERE name=$1 LIMIT 1`, [name]);
                if (!exists.rows.length) {
                    await client.query(
                        `INSERT INTO products (name, category, price, description, images, featured)
             VALUES ($1,$2,$3,$4,$5,$6)`,
                        [name, cat, price, descriptions[cat] || '', JSON.stringify(imgData), featured]
                    );
                    insertedProducts++;
                }
                idx++;
            }
        }
        console.log(`✅ Seeded ${insertedCats} categories and ${insertedProducts} products (images stored in DB).`);
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

seed().catch(err => { console.error(err); process.exit(1); });
