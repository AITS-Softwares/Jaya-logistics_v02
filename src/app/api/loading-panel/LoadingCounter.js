import mongoose from 'mongoose';
import { nextCompanyDocumentNumber } from '@/lib/documentSequence';

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

export async function getNextLoadingNumber(companyId, subCompanyId, subCompanyCode) {
  return nextCompanyDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'LOD', width: 5 });
}

const LoadingCounter = mongoose.models.LoadingCounter || 
  mongoose.model('LoadingCounter', loadingCounterSchema);

export default LoadingCounter;
