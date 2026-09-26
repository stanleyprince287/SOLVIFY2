import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } from '../../lib/cookies.js';
import { UnauthorizedError } from '../../lib/errors.js';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await authService.register(req.body);
      setAuthCookies(res, session.accessToken, session.refreshToken);
      res.status(201).json({ data: { user: session.user } });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await authService.login(req.body);
      setAuthCookies(res, session.accessToken, session.refreshToken);
      res.json({ data: { user: session.user } });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.[REFRESH_COOKIE];
      if (!token) throw new UnauthorizedError('Your session has expired. Please sign in again.');
      const session = await authService.refresh(token);
      setAuthCookies(res, session.accessToken, session.refreshToken);
      res.json({ data: { user: session.user } });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.cookies?.[REFRESH_COOKIE]);
      clearAuthCookies(res);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.actor!.id);
      res.json({ data: { user } });
    } catch (err) {
      next(err);
    }
  },
};