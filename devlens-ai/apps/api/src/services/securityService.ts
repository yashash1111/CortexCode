import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendLoginAlert, sendPasswordChangeAlert } from './emailService';

const prisma = new PrismaClient();

export interface UserAgentInfo {
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
}

/**
 * Parse User-Agent and request IP
 */
export function parseSecurityClientDetails(req: Request): UserAgentInfo {
  const ua = req.headers['user-agent'] || '';
  
  // Extract IP
  const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ipAddress = rawIp.split(',')[0].trim();

  // Extract Browser
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

  // Extract OS
  let os = 'Unknown OS';
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  // Extract Device Type
  let device = 'Desktop';
  if (ua.includes('iPhone') || ua.includes('iPad')) device = 'Apple Mobile';
  else if (ua.includes('Macintosh')) device = 'MacBook';
  else if (ua.includes('Android')) device = 'Android Device';
  else if (ua.includes('Windows')) device = 'Windows PC';

  return {
    device,
    browser,
    os,
    ipAddress,
    location: 'Unavailable' // Never fabricate location if geo-ip unavailable
  };
}

/**
 * 1. Record Successful Login & Trigger Security Alert AFTER Authentication Succeeds
 */
export async function recordLoginSecurityEvent(req: Request, user: { id: string; email: string; name: string }) {
  const details = parseSecurityClientDetails(req);
  const now = new Date();

  // Save Security Event to Database
  try {
    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: 'LOGIN',
        ipAddress: details.ipAddress,
        userAgent: req.headers['user-agent'] || '',
        device: details.device,
        browser: details.browser,
        operatingSystem: details.os,
        location: details.location,
        success: true,
        timestamp: now
      }
    });
  } catch (err) {
    console.error('[SecurityService Error] Failed to persist login security event:', err);
  }

  // Trigger Email Alert asynchronously
  sendLoginAlert(user, {
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    device: details.device,
    browser: details.browser,
    os: details.os,
    ipAddress: details.ipAddress,
    location: details.location
  });
}

/**
 * 2. Record Password Change & Trigger Security Alert AFTER Password Change Succeeds
 */
export async function recordPasswordChangeSecurityEvent(req: Request, user: { id: string; email: string; name: string }) {
  const details = parseSecurityClientDetails(req);
  const now = new Date();

  // Save Security Event to Database
  try {
    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_CHANGED',
        ipAddress: details.ipAddress,
        userAgent: req.headers['user-agent'] || '',
        device: details.device,
        browser: details.browser,
        operatingSystem: details.os,
        location: details.location,
        success: true,
        timestamp: now
      }
    });
  } catch (err) {
    console.error('[SecurityService Error] Failed to persist password change event:', err);
  }

  // Trigger Email Alert asynchronously
  sendPasswordChangeAlert(user, {
    date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    device: details.device,
    browser: details.browser,
    ipAddress: details.ipAddress
  });
}

/**
 * Fetch Recent Security Activity for User
 */
export async function getUserSecurityEvents(userId: string) {
  try {
    const events = await prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    return events;
  } catch {
    return [];
  }
}

/**
 * Revoke All Other Refresh Token Sessions for User
 */
export async function revokeUserSessions(userId: string) {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return true;
  } catch {
    return false;
  }
}
