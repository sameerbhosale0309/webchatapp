import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  });

  const refreshToken = jwt.sign({ userId }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}
