import mongoose from 'mongoose';
import { LEAVE_STATUS } from '@workboard/shared';

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true, trim: true },
  status: { type: String, enum: Object.values(LEAVE_STATUS), default: LEAVE_STATUS.PENDING },
  aiDecision: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model('LeaveRequest', leaveRequestSchema);