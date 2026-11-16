import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import customersRouter from './routes/customers.js';
import paymentsRouter from './routes/payments.js';
import statsRouter from './routes/stats.js';
import sourcingRouter from './routes/sourcing.js';
import aiRouter from './routes/ai.js';
import { requireAuth } from './lib/auth.js';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', requireAuth);

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/stats', statsRouter);
app.use('/api', statsRouter); // alias: /api/overview and /api/sales
app.use('/api', sourcingRouter); // POST /api/find, /api/restock (supplier sourcing)
app.use('/api', aiRouter); // POST /api/insights (and the old /find, which sourcing overrides)

app.use((req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`MediFind API running on http://localhost:${PORT}`));