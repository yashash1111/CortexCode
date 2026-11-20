import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function getRequiredSecret(envKey: string): string {
  const val = process.env[envKey];
  if (!val || val.trim().length < 8) {
    throw new Error(`Security configuration error: ${envKey} must be set and at least 8 characters`);
  }
  return val;
}

export interface JwtPayload {
  userId: string;
}

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, getRequiredSecret('JWT_SECRET'), { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, jti: crypto.randomUUID() }, getRequiredSecret('JWT_REFRESH_SECRET'), { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, getRequiredSecret('JWT_SECRET')) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, getRequiredSecret('JWT_REFRESH_SECRET')) as JwtPayload;
};
