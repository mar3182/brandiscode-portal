import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }

      const decoded = jwt.verify(token, jwtSecret) as {
        id: string;
        email: string;
        role: string;
      };

      // Add user from payload to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };

      next();
    } catch (error) {
      const err = new Error('Not authorized, token failed') as AppError;
      err.statusCode = 401;
      next(err);
    }
  }

  if (!token) {
    const err = new Error('Not authorized, no token') as AppError;
    err.statusCode = 401;
    next(err);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const err = new Error('Not authorized, no user') as AppError;
      err.statusCode = 401;
      return next(err);
    }

    if (!roles.includes(req.user.role)) {
      const err = new Error(`Role (${req.user.role}) is not authorized to access this resource`) as AppError;
      err.statusCode = 403;
      return next(err);
    }
    
    next();
  };
};
