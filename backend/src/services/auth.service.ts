import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User';

export class AuthService {
  static generateAccessToken(userId: string, role: string): string {
    const secret = process.env.JWT_SECRET?.trim() || 'supersecretkey123';
    return jwt.sign({ id: userId, role }, secret, { expiresIn: '15m' });
  }

  static generateRefreshToken(userId: string): string {
    const refreshSecret = process.env.JWT_REFRESH_SECRET?.trim() || 'supersecretrefresh456';
    return jwt.sign({ id: userId }, refreshSecret, { expiresIn: '7d' });
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
