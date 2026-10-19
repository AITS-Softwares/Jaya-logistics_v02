import mongoose from 'mongoose';
import { nextPeriodDocumentNumber } from '@/lib/documentSequence';

const loadingCounterSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  sequence: {
    type: Number,
    default: 0
  },
  prefix: {
    type: String,
    default: 'LD'
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
}, {
  timestamps: true
});

// The period in the label changes over time; the underlying sequence does not reset.
export async function getNextLoadingNumber(companyId, subCompanyId, subCompanyCode) {
  return nextPeriodDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'LD', width: 4 });
}

const LoadingCounter = mongoose.models.LoadingCounter ||
  mongoose.model('LoadingCounter', loadingCounterSchema);

export default LoadingCounter;
