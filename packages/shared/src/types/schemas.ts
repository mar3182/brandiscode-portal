import { z } from 'zod';

// User schemas
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const UserRegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

// Brand schemas
export const BrandSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string().optional(),
  userId: z.string(),
  visionStatement: z.string().optional(),
  missionStatement: z.string().optional(),
  uniqueValueProposition: z.string().optional(),
  values: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  visionStatement: z.string().optional(),
  missionStatement: z.string().optional(),
  uniqueValueProposition: z.string().optional(),
  values: z.array(z.string()).optional(),
});

export const UpdateBrandSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  visionStatement: z.string().optional(),
  missionStatement: z.string().optional(),
  uniqueValueProposition: z.string().optional(),
  values: z.array(z.string()).optional(),
});

// IDP (Interactive Decision Pathway) schemas
export const IDPTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['not-started', 'in-progress', 'completed']),
});

export const IDPStageSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['not-started', 'in-progress', 'completed']),
  tasks: z.array(IDPTaskSchema),
});

export const IDPSchema = z.object({
  brandId: z.string(),
  stages: z.array(IDPStageSchema),
});

// Export types
export type User = z.infer<typeof UserSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserRegister = z.infer<typeof UserRegisterSchema>;

export type Brand = z.infer<typeof BrandSchema>;
export type CreateBrand = z.infer<typeof CreateBrandSchema>;
export type UpdateBrand = z.infer<typeof UpdateBrandSchema>;

export type IDPTask = z.infer<typeof IDPTaskSchema>;
export type IDPStage = z.infer<typeof IDPStageSchema>;
export type IDP = z.infer<typeof IDPSchema>;
