# 🥒 Awesome Pickle Website

A full-stack e-commerce website for selling pickles, built with Node.js/Express backend and React frontend.

## Features

### 🛍️ Customer Features
- **User Authentication**: Register, login, and manage profiles
- **Pickle Catalog**: Browse, search, and filter pickles by category
- **Product Details**: View detailed pickle information with reviews
- **Shopping Cart**: Add items, update quantities, and manage cart
- **Order Management**: Place orders and view order history
- **Reviews & Ratings**: Rate and review pickles

### 🛠️ Admin Features
- **Admin Dashboard**: View statistics and manage the store
- **Product Management**: Add, edit, and delete pickles
- **Order Management**: View and update order status
- **User Management**: View user accounts and manage roles

### 🏗️ Technical Features
- **MCP Backend**: Multi-Command Processor with RESTful API
- **SQLite Database**: Lightweight, file-based database
- **JWT Authentication**: Secure user authentication
- **Responsive Design**: Modern, mobile-friendly UI
- **Real-time Updates**: Live cart and order updates

## Tech Stack

### Backend (MCP)
- **Node.js** with Express.js
- **SQLite** database
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** enabled for frontend communication

### Frontend
- **React** with hooks and context
- **React Router** for navigation
- **Axios** for API calls
- **React Icons** for beautiful icons
- **React Toastify** for notifications

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd pickle
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

## Project Structure

```
pickle/
├── server/                 # Backend (MCP)
│   ├── index.js           # Main server file
│   ├── database/          # Database initialization
│   └── routes/            # API routes
│       ├── auth.js        # Authentication routes
│       ├── pickles.js     # Pickle catalog routes
│       ├── orders.js      # Order management routes
│       └── admin.js       # Admin routes
├── client/                # Frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main app component
│   └── public/            # Static files
└── package.json           # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/logout` - Logout user

### Pickles
- `GET /api/pickles` - Get all pickles (with filters)
- `GET /api/pickles/:id` - Get single pickle with reviews
- `GET /api/pickles/categories/all` - Get all categories
- `POST /api/pickles/:id/reviews` - Add review (authenticated)

### Orders
- `POST /api/orders` - Create new order (authenticated)
- `GET /api/orders/my-orders` - Get user's orders (authenticated)
- `GET /api/orders/:orderId` - Get order details (authenticated)

### Admin
- `GET /api/admin/dashboard` - Get dashboard stats (admin)
- `GET /api/admin/orders` - Get all orders (admin)
- `GET /api/admin/users` - Get all users (admin)
- `POST /api/admin/pickles` - Add new pickle (admin)
- `PUT /api/admin/pickles/:id` - Update pickle (admin)
- `DELETE /api/admin/pickles/:id` - Delete pickle (admin)

## Default Admin Account

The system comes with a default admin account:
- **Email**: admin@pickles.com
- **Password**: admin123
- **Role**: admin

## Sample Data

The database is initialized with sample pickles:
- Classic Dill Pickles
- Spicy Jalapeño Pickles
- Sweet Bread & Butter Pickles
- Garlic Dill Pickles
- Pickled Onions

## Development

### Available Scripts

```bash
# Install all dependencies (backend + frontend)
npm run install-all

# Start both servers in development mode
npm run dev

# Start only the backend server
npm run server

# Start only the frontend server
npm run client

# Build the frontend for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Session Secret
SESSION_SECRET=your-super-secret-session-key-here

# Frontend URL (for OAuth callback)
FRONTEND_URL=http://localhost:3000

# Google OAuth Configuration
# Get these from https://console.developers.google.com/
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set Application Type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback` (for development)
   - `https://yourdomain.com/api/auth/google/callback` (for production)
7. Copy the Client ID and Client Secret to your `.env` file

## Deployment

### Backend Deployment
1. Set up a Node.js server (Heroku, DigitalOcean, etc.)
2. Install dependencies: `npm install`
3. Set environment variables
4. Start the server: `npm start`

### Frontend Deployment
1. Build the frontend: `npm run build`
2. Deploy the `client/build` folder to a static hosting service
3. Update API URLs in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.

---

**Happy Pickling! 🥒** 