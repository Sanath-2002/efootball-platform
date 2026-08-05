import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import competitionRoutes from './routes/competitionRoutes';
import teamRoutes from './routes/teamRoutes';
import matchRoutes from './routes/matchRoutes';
import { seedDefaultAdmin } from './config/seedAdmin';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Render / Cloudflare) for rate limiting IP detection
app.set('trust proxy', 1);

// CORS setup
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS Policy: Origin not allowed'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`⚡ eFootball Platform Server running on port ${PORT}`);
  await seedDefaultAdmin();
});
