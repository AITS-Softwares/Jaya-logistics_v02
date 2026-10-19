// /utils/PricingCounter.js
import mongoose from 'mongoose';
import { nextPeriodDocumentNumber } from '@/lib/documentSequence';

const pricingCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    default: 0
  }
});

const PricingCounter = mongoose.models.PricingCounter || 
  mongoose.model('PricingCounter', pricingCounterSchema);

// Function to get next pricing serial number
export async function getNextPricingSerialNumber(companyId, subCompanyId, subCompanyCode) {
  return nextPeriodDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'PRC', width: 4 });
}

export default PricingCounter;
