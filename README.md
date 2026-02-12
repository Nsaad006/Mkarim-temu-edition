# MKARIM - E-Commerce Platform

A full-stack e-commerce platform for IT and gaming products built with React, TypeScript, Node.js, Express, and PostgreSQL.

## 🚀 Features

- **Product Management**: Browse products by categories with advanced filtering
- **Shopping Cart**: Add products to cart with real-time updates
- **Order Management**: Complete COD (Cash on Delivery) order system
- **Admin Dashboard**: Comprehensive admin panel for managing products, orders, categories, and settings
- **User Authentication**: Secure JWT-based authentication for admin users
- **Responsive Design**: Mobile-first design with modern UI components
- **Image Upload**: Multi-image upload support for products
- **Dynamic Settings**: Configurable store settings, contact information, and content
- **Analytics**: Order tracking and sales analytics

## 📋 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Shadcn/ui** for UI components
- **React Query** for data fetching and caching
- **React Router** for navigation
- **Framer Motion** for animations
- **Axios** for API calls

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Prisma ORM** with PostgreSQL
- **JWT** for authentication
- **Multer** for file uploads
- **Bcrypt** for password hashing

## 🛠️ Prerequisites

- Node.js 18 or higher
- PostgreSQL database (Neon.tech recommended)
- npm or yarn package manager

## 📦 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd maroc-cash-flow-main-v2
```

### 2. Install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure environment variables

#### Backend (.env)
Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

#### Frontend
The frontend uses `VITE_API_URL` environment variable. Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3001
```

### 4. Setup Database

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed initial data (optional)
npx tsx prisma/seed.ts
```

### 5. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:8080
- Backend: http://localhost:3001

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create environment file**
   ```bash
   cp .env.example .env
   ```

2. **Update environment variables** in the root `.env`:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `VITE_API_URL`: The public-facing URL of your backend API (e.g., `http://localhost:3001` or `https://api.yourdomain.com`).
   - `FRONTEND_URL`: The public-facing URL of your frontend.

3. **Build and run**
   ```bash
   docker compose up -d --build
   ```

4. **Verify Health**
   You can monitor the service health:
   - Backend: `http://localhost:3001/health`
   - Frontend: `http://localhost/health`

5. **Run database migrations (once running)**
   ```bash
   docker compose exec backend npx prisma migrate deploy
   ```

6. **Seed database (optional)**
   ```bash
   docker compose exec backend npx tsx prisma/seed.ts
   ```

### Individual Docker Builds

#### Backend
```bash
cd backend
docker build -t mkarim-backend .
docker run -p 3001:3001 --env-file .env mkarim-backend
```

#### Frontend
```bash
cd frontend
docker build -t mkarim-frontend --build-arg VITE_API_URL=http://your-api-url .
docker run -p 80:80 mkarim-frontend
```

## 🌐 Deployment Options

### Option 1: VPS/Cloud Server (DigitalOcean, AWS, etc.)

1. **Setup server** with Docker and Docker Compose
2. **Clone repository** to server
3. **Configure environment variables**
4. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```
5. **Setup reverse proxy** (Nginx/Caddy) for SSL

### Option 2: Platform-as-a-Service

#### Render.com
- **Backend**: Deploy as Web Service
  - Build Command: `npm install && npx prisma generate && npm run build`
  - Start Command: `npm run db:deploy && npm start`
  
- **Frontend**: Deploy as Static Site
  - Build Command: `npm install && npm run build`
  - Publish Directory: `dist`

#### Railway.app
- Connect GitHub repository
- Railway auto-detects Node.js apps
- Add environment variables in dashboard
- Deploy both frontend and backend as separate services

#### Vercel (Frontend only)
- Connect GitHub repository
- Configure build settings:
  - Framework: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`

### Option 3: Traditional Hosting

1. **Build the applications**:
   ```bash
   # Backend
   cd backend
   npm run build
   
   # Frontend
   cd frontend
   npm run build
   ```

2. **Upload files**:
   - Backend: Upload `dist/`, `node_modules/`, `package.json`, `prisma/`
   - Frontend: Upload `dist/` contents to web root

3. **Configure web server** (Nginx/Apache) to serve frontend and proxy API requests

## 📝 Environment Variables Reference

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `production` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://yourdomain.com` |

### Frontend
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.yourdomain.com` |

## 🔒 Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure environment variables
- [ ] Enable rate limiting
- [ ] Configure firewall rules
- [ ] Regular database backups
- [ ] Update dependencies regularly

## 📚 API Documentation

### Public Endpoints
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `GET /api/categories` - List categories
- `GET /api/cities` - List delivery cities
- `POST /api/orders` - Create order
- `POST /api/contact` - Submit contact form

### Admin Endpoints (Requires Authentication)
- `POST /api/auth/login` - Admin login
- `GET /api/admin/*` - Various admin operations
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is proprietary software.

## 🆘 Support

For support, email contact@mkarim.ma or open an issue in the repository.

## 🔄 Maintenance

### Database Migrations
```bash
# Create new migration
npm run prisma:migrate

# Deploy migrations to production
npm run db:deploy
```

### Backup Database
```bash
# Using pg_dump
pg_dump $DATABASE_URL > backup.sql
```

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update packages
npm update
```

## 📊 Monitoring

- Monitor application logs
- Set up error tracking (Sentry recommended)
- Monitor database performance
- Track API response times
- Monitor disk space for uploads

---

Built with ❤️ for MKARIM
