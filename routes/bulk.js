const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const adminRouter = require('./admin');
const { sendAdminBulkAlert } = require('../utils/mailer');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'] || req.query.token;
    if (token && adminRouter.validTokens?.has(token)) return next();
    if (token && req.session?.adminToken && req.session.adminToken === token) return next();
    if (req.isAuthenticated?.() && ADMIN_EMAILS.includes((req.user?.email || '').toLowerCase())) return next();
    if (req.session?.isAdmin) return next();
    return res.status(401).json({ error: 'Unauthorized' });
}

// ── POST /api/bulk – Public bulk/event inquiry submission ─────────────────────
router.post('/', express.json(), async (req, res) => {
    try {
        const {
            event_type,
            customer_name,
            phone,
            email,
            event_date,
            location,
            packaging,
            items,
            pickle_choices,
            quantity_kg,
            notes
        } = req.body || {};

        const cleanName = String(customer_name || '').trim().slice(0, 255);
        const cleanPhone = String(phone || '').trim().slice(0, 40);
        const phoneDigits = cleanPhone.replace(/\D/g, '');
        const cleanEvent = String(event_type || 'Event / Celebration').trim().slice(0, 100);

        if (!cleanName || !cleanPhone) {
            return res.status(400).json({ error: 'Name and phone number are required.' });
        }
        if (phoneDigits.length < 7) {
            return res.status(400).json({ error: 'Please enter a valid phone / WhatsApp number (at least 7 digits).' });
        }

        // Normalize structured per-pickle items [{ name, qty, unit }]
        const cleanItems = Array.isArray(items)
            ? items
                .map(i => ({
                    name: String(i?.name || '').trim().slice(0, 120),
                    qty: Math.max(0.5, Math.min(10000, parseFloat(i?.qty) || 1)),
                    unit: String(i?.unit || 'kg').trim().slice(0, 40)
                }))
                .filter(i => i.name)
            : [];

        const cleanNotes = notes ? String(notes).trim().slice(0, 2000) : null;

        if (!cleanItems.length && !cleanNotes && !pickle_choices) {
            return res.status(400).json({ error: 'Please select at least one pickle (with quantity) or add notes.' });
        }

        // Compute readable summaries alongside structured JSONB items
        const computedChoices = cleanItems.length
            ? cleanItems.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ')
            : (pickle_choices ? String(pickle_choices).trim().slice(0, 1000) : null);

        let totalKg = 0;
        let totalJars = 0;
        for (const it of cleanItems) {
            if (it.unit.toLowerCase() === 'kg') totalKg += it.qty;
            else totalJars += it.qty;
        }
        const summaryParts = [];
        if (totalKg > 0) summaryParts.push(`${Number(totalKg.toFixed(2))} kg`);
        if (totalJars > 0) summaryParts.push(`${Math.round(totalJars)} jars`);
        const computedQtySummary = summaryParts.length
            ? summaryParts.join(' + ')
            : (quantity_kg ? String(quantity_kg).trim().slice(0, 100) : null);

        const { rows } = await pool.query(
            `INSERT INTO bulk_inquiries
             (event_type, customer_name, phone, email, event_date, location, packaging, items, pickle_choices, quantity_kg, notes, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,'new')
             RETURNING *`,
            [
                cleanEvent,
                cleanName,
                cleanPhone,
                email ? String(email).trim().slice(0, 255) : null,
                event_date ? String(event_date).trim().slice(0, 100) : null,
                location ? String(location).trim().slice(0, 255) : null,
                packaging ? String(packaging).trim().slice(0, 120) : null,
                JSON.stringify(cleanItems),
                computedChoices,
                computedQtySummary,
                cleanNotes
            ]
        );

        sendAdminBulkAlert(rows[0]).catch(err => console.warn('Bulk alert email error:', err.message));
        res.status(201).json({ success: true, inquiry: rows[0] });
    } catch (err) {
        console.error('/api/bulk POST error:', err.message);
        res.status(500).json({ error: 'Could not submit inquiry. Please try again.' });
    }
});

// ── GET /api/bulk/admin – List all bulk inquiries ─────────────────────────────
router.get('/admin', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM bulk_inquiries ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/bulk/admin/:id/status – Update inquiry status ──────────────────
router.patch('/admin/:id/status', requireAdmin, express.json(), async (req, res) => {
    const allowed = ['new', 'contacted', 'quoted', 'confirmed', 'completed', 'cancelled'];
    const { status } = req.body || {};
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const { rows } = await pool.query(
            `UPDATE bulk_inquiries SET status=$1 WHERE id=$2 RETURNING *`,
            [status, req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/bulk/admin/:id – Delete inquiry ───────────────────────────────
router.delete('/admin/:id', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`DELETE FROM bulk_inquiries WHERE id=$1`, [req.params.id]);
        if (!result.rowCount) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
