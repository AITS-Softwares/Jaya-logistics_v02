import mongoose from 'mongoose';
import { nextPeriodDocumentNumber } from '@/lib/documentSequence';

const balancePaymentCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
  prefix: { type: String, default: 'BLP' },
  year: { type: Number, default: () => new Date().getFullYear() }
}, { timestamps: true });

const BalancePaymentCounter = mongoose.models.BalancePaymentCounter || 
  mongoose.model('BalancePaymentCounter', balancePaymentCounterSchema);

export async function getNextBalancePaymentNumber(companyId, subCompanyId, subCompanyCode, session = null) {
  return nextPeriodDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'BLP', width: 4, session });
}

export default BalancePaymentCounter;
