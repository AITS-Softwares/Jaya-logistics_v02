import mongoose from 'mongoose';
import { adminPushDefaults } from '@/lib/adminNotificationPolicy.mjs';

const schema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, required: true },
  account: { type: mongoose.Schema.Types.ObjectId, required: true },
  ...Object.fromEntries(Object.entries(adminPushDefaults).map(([key, value]) => [key, { type: Boolean, default: value }])),
}, { timestamps: true });
schema.index({ company: 1, account: 1 }, { unique: true });
export default mongoose.models.ERPNotificationPreference || mongoose.model('ERPNotificationPreference', schema, 'notificationpreferences');
