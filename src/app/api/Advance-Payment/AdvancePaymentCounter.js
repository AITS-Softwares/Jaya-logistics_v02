import mongoose from 'mongoose';
import { nextPeriodDocumentNumber } from '@/lib/documentSequence';

const advancePaymentCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    default: 0
  },
  prefix: {
    type: String,
    default: 'ADV'
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
}, {
  timestamps: true
});

const AdvancePaymentCounter = mongoose.models.AdvancePaymentCounter || 
  mongoose.model('AdvancePaymentCounter', advancePaymentCounterSchema);

export async function getNextAdvancePaymentNumber(companyId, subCompanyId, subCompanyCode) {
  return nextPeriodDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'ADV', width: 4 });
}

export default AdvancePaymentCounter;
