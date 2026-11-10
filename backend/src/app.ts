import express from 'express';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import accountRoutes from './routes/accountRoutes';
import adminRoutes from './routes/adminRoutes';
import ledgerRoutes from './routes/ledgerRoutes';
import healthRoutes from './routes/healthRoutes';

export const app = express();

// Security and utility middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api', apiLimiter);

// Register routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ledger', ledgerRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to BalanceVault API — Money movement with a ledger you can prove',
    documentation: '/api/docs',
    healthCheck: '/health',
    readinessCheck: '/ready'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

export default app;

