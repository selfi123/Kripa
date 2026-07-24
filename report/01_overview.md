# KRIPA Pickles - Architecture Overview

## Introduction
The KRIPA Pickles website is a full-stack e-commerce application built with Node.js and Express on the backend, using PostgreSQL for the database. It handles product browsing, cart management, checkout with Razorpay integration, Google OAuth for authentication, and includes a comprehensive admin dashboard.

## Key Technologies
- **Backend Framework**: Express.js (Node.js)
- **Database**: PostgreSQL (pg pool, connect-pg-simple for sessions)
- **Authentication**: Passport.js (Google OAuth 2.0)
- **Payment Gateway**: Razorpay
- **File Uploads**: Cloudinary (for images)
- **Push Notifications**: Web-Push
- **Mailing**: Nodemailer (assumed based on util usage)
- **PDF Generation**: PDFKit (for invoices)

## High-Level Architecture
1. **Server Initialization (`server.js`)**:
   - Connects to PostgreSQL and automatically runs `schema.sql` migration if `DATABASE_URL` is provided.
   - Configures middleware: CORS, JSON parsing, session management (DB-backed).
   - Initializes Passport for Google Auth.
   - Serves static files from `public/`, `categoriess/`, and `uploads/`.
   - Mounts specialized routers (`/api`, `/api/admin`, `/auth`, `/api/orders`, etc.).
   
2. **Database Schema Map**:
   - `users`: Stores user info (Google ID, email, role).
   - `products`: Stores product listings.
   - `categories`: Hierarchical category structure.
   - `orders`: Tracks user orders and Razorpay payment details.
   - `coupons`: Discount code management.
   - `reviews`: Product reviews.
   - `preorder_listings` & `prebook_requests`: Preorder module.
   - `push_subscriptions`: Web-push tokens.

## Routing Modules
- `routes/api.js`: Public endpoints for products, categories, reviews, and stats.
- `routes/auth.js`: Google OAuth and session management.
- `routes/orders.js`: Checkout, Razorpay order creation, payment verification, order tracking.
- `routes/admin.js`: Protected routes for admin dashboard (CRUD for products/categories, order management).
- `routes/coupons.js`: Coupon application logic.
- `routes/preorders.js`: Pre-booking module endpoints.
- `routes/push.js`: VAPID keys and push notification subscriptions.
