import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthService } from '../services/auth.service';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const passwordHash = await AuthService.hashPassword(password);
    const user = await User.create({ name, email, passwordHash });

    const token = AuthService.generateAccessToken(user.id, user.role);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await AuthService.comparePassword(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = AuthService.generateAccessToken(user.id, user.role);
    const refreshToken = AuthService.generateRefreshToken(user.id);
    
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, token });
  } catch (error) {
    next(error);
  }
};
