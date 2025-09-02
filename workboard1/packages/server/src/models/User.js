import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '@workboard/shared';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.EMPLOYEE },
  passwordHash: { type: String, required: true },
  leaveBalance: { type: Number, default: 12 }
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; } }
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function(password) {
  return bcrypt.hash(password, 12);
};

export default mongoose.model('User', userSchema);