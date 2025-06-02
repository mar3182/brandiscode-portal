import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';

// Temporary user data (will be replaced with database later)
const users = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
  },
];

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  // Return users without password field
  const safeUsers = users.map(({ id, name, email, role }) => ({
    id,
    name,
    email,
    role,
  }));
  
  res.status(200).json(safeUsers);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Return user without password field
  const { id, name, email, role } = user;
  
  res.status(200).json({
    id,
    name,
    email,
    role,
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

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
    role: role || 'user',
  };

  users.push(user);

  // Return user without password field
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);

  if (userIndex === -1) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, email, role } = req.body;

  if (name) users[userIndex].name = name;
  if (email) users[userIndex].email = email;
  if (role) users[userIndex].role = role;

  // Return updated user without password field
  const { id, name: updatedName, email: updatedEmail, role: updatedRole } = users[userIndex];
  
  res.status(200).json({
    id,
    name: updatedName,
    email: updatedEmail,
    role: updatedRole,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);

  if (userIndex === -1) {
    res.status(404);
    throw new Error('User not found');
  }

  users.splice(userIndex, 1);

  res.status(200).json({ message: 'User removed' });
});
