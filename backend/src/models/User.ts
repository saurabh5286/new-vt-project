import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: 'Guest' | 'User' | 'Premium' | 'Admin' | 'SuperAdmin';
  isVerified: boolean;
  googleId?: string;
  githubId?: string;
  limitStorage: number;
  usedStorage: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['Guest', 'User', 'Premium', 'Admin', 'SuperAdmin'], 
    default: 'User' 
  },
  isVerified: { type: Boolean, default: false },
  googleId: String,
  githubId: String,
  limitStorage: { type: Number, default: 10 * 1024 * 1024 }, // 10MB default
  usedStorage: { type: Number, default: 0 },
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);
