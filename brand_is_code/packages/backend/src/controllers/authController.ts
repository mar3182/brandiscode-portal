import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/authMiddleware';

// Temporary user data for MVP (will be replaced with database later)
const users = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'john123',
    role: 'user',
  },
];

// Generate JWT token
const generateToken = (id: string, email: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET || 'tempsecret';
  return jwt.sign({ id, email, role }, jwtSecret, {
    expiresIn: '30d',
  });
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Check for user email
  const user = users.find(u => u.email === email);

  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Check password (this would use bcrypt in a real app)
  if (user.password !== password) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id, user.email, user.role),
  });
});

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // Check if user exists
  if (users.find(u => u.email === email)) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Create user
  const user = {
    id: (users.length + 1).toString(),
    name,
    email,
    password, // would be hashed in a real app
    role: 'user',
  };

  users.push(user);

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user.id, user.email, user.role),
  });
});

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }

  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  // Check for user email
  const user = users.find(u => u.email === email);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // In a real app, generate a token and send an email
  res.status(200).json({ message: 'Password reset email sent' });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  // In a real app, verify token and update password
  res.status(200).json({ message: 'Password reset successful' });
});
