import mongoose from 'mongoose';

export const paymentSettlementSchema = new mongoose.Schema({
  source: { type: String, enum: ['manual', 'ICICI'] }, reference: String, amount: Number,
  confirmedAt: Date, confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }, confirmedByName: String,
}, { _id: false });
export const paymentEmailSchema = new mongoose.Schema({
  requested: { type: Boolean, default: false }, sentAt: { type: Date, default: null }, sentTo: String, sentBy: String,
  count: { type: Number, default: 0 }, lastError: { type: String, default: '' },
  sendingUntil: { type: Date, default: null }, attemptId: String,
  history: [{ sentAt: Date, sentTo: String, sentBy: String, reference: String, amount: Number, resend: Boolean }],
}, { _id: false });
