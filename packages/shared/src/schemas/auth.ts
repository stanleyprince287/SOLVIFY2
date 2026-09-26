import { z } from 'zod';
import { Role } from '../enums.js';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(7, 'Please enter a valid phone number')
    .max(20)
    .regex(/^[+0-9\s-]+$/, 'Phone number can only contain digits, spaces, + and -'),
  password,
  role: z.enum([Role.CUSTOMER, Role.PROFESSIONAL]),
  displayName: z.string().trim().min(2).max(120).optional(),
  businessName: z.string().trim().max(160).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;