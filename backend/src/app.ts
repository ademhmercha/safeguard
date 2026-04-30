import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import childRoutes from './routes/children';
import deviceRoutes from './routes/devices';
import pairingRoutes from './routes/pairing';
import deviceDataRoutes from './routes/deviceData';
import monitoringRoutes from './routes/monitoring';
import controlRoutes from './routes/control';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import activityRoutes from './routes/activity';

import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authenticate';

const app = express();

app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', pairingRoutes);
app.use('/api', deviceDataRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/children', authenticate, childRoutes);
app.use('/api/devices', authenticate, deviceRoutes);
app.use('/api/monitoring', authenticate, monitoringRoutes);
app.use('/api/control', authenticate, controlRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/activity', authenticate, activityRoutes);

app.use(errorHandler);

export default app;
