import mongoose from 'mongoose';
import { nextCompanyDocumentNumber } from '@/lib/documentSequence';

const balancePaymentCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
  prefix: { type: String, default: 'BLP' },
  year: { type: Number, default: () => new Date().getFullYear() }
}, { timestamps: true });

const BalancePaymentCounter = mongoose.models.BalancePaymentCounter || 
  mongoose.model('BalancePaymentCounter', balancePaymentCounterSchema);

export async function getNextBalancePaymentNumber(companyId, subCompanyId, subCompanyCode) {
  return nextCompanyDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'BLP', width: 5 });
}

export default BalancePaymentCounter;
