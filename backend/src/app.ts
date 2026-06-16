import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import citiesRouter from './routes/cities';
import categoriesRouter from './routes/categories';
import settingsRouter from './routes/settings';
import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import adminsRouter from './routes/admins';
import statsRouter from './routes/stats';
import contactsRouter from './routes/contacts';
import uploadRouter from './routes/upload';
import heroSlidesRouter from './routes/hero-slides';
import suppliersRouter from './routes/suppliers';
import procurementsRouter from './routes/procurements';
import capitalRouter from './routes/capital';
import wholesalersRouter from './routes/wholesalers';
import rolesRouter from './routes/roles';
import eventsRouter from './routes/events';
import activityLogsRouter from './routes/activityLogs';

const app = express();

// Serve uploaded files BEFORE helmet to avoid CSP issues
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }  // Allow cross-origin images
}));
app.use(cors({
    origin: (origin, callback) => {
        // No origin = server-to-server or same-origin → allow
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'https://mkarim.net',
            'https://www.mkarim.net',
            'https://mkarim.ma',
            'https://www.mkarim.ma',
            'http://localhost:8080',
            'http://localhost:8081',
            'http://localhost:8082',
            'http://localhost:5173',
        ];

        // Also allow any origin set via FRONTEND_URL env var (comma-separated)
        const envOrigins = (process.env.FRONTEND_URL || '').split(',').map(s => s.trim()).filter(Boolean);
        const allAllowed = [...allowedOrigins, ...envOrigins];

        if (allAllowed.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/admins', adminsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/hero-slides', heroSlidesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/procurements', procurementsRouter);
app.use('/api/capital', capitalRouter);
app.use('/api/wholesalers', wholesalersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/logs', activityLogsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

export default app;
