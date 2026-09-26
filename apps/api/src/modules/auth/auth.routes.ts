import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@solvify/shared';

export const authRoutes = Router();

authRoutes.post('/register', registerLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);

// Placeholders — wired in Phase 9 alongside the notification/email driver.
authRoutes.post('/forgot-password', validate(forgotPasswordSchema), (_req, res) =>
  res.status(202).json({ data: { message: 'If that email exists, a reset link has been sent.' } }),
);
authRoutes.post('/reset-password', validate(resetPasswordSchema), (_req, res) =>
  res.status(501).json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Password reset is coming soon.' },
  }),
);