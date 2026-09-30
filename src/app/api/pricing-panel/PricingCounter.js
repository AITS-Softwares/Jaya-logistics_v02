// /utils/PricingCounter.js
import mongoose from 'mongoose';
import { nextCompanyDocumentNumber } from '@/lib/documentSequence';

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
  return nextCompanyDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'PRC', width: 5 });
}

export default PricingCounter;
