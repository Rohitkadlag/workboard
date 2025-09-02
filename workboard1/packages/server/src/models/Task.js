import mongoose from 'mongoose';
import { TASK_STATUS } from '@workboard/shared';

const taskSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: Object.values(TASK_STATUS), default: TASK_STATUS.BACKLOG },
  dueDate: Date,
  points: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);