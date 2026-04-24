import type { JwtUser } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export {};
