// PurchaseCounter.js
import mongoose from 'mongoose';
import { nextPeriodDocumentNumber } from '@/lib/documentSequence';

const purchaseCounterSchema = new mongoose.Schema({
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
    default: 'PUR'
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
}, {
  timestamps: true
});

const PurchaseCounter = mongoose.models.PurchaseCounter || 
  mongoose.model('PurchaseCounter', purchaseCounterSchema);

export async function getNextPurchaseNumber(companyId, subCompanyId, subCompanyCode) {
  return nextPeriodDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'PUR', width: 4 });
}

export default PurchaseCounter;
