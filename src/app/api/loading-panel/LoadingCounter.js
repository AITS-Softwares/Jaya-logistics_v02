import mongoose from 'mongoose';
import { nextYearlyDocumentNumber } from '@/lib/documentSequence';
import LoadingPanel from './LoadingPanel';

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

// Loading Info number: <CODE>-LD-<year>-<number>, e.g. JGL-LD-2026-0014.
// 4 digits to start; it becomes 5 digits after 9999 and 6 digits after 99999 on its own.
// The first number of a year continues after the highest number already saved for that year.
export async function getNextLoadingNumber(companyId, subCompanyId, subCompanyCode) {
  const code = String(subCompanyCode || '').trim().toUpperCase();
  const year = new Date().getFullYear();
  const re = new RegExp(`^${code}-LD-${year}-(\\d+)$`);
  return nextYearlyDocumentNumber({
    companyId, subCompanyId, subCompanyCode, documentType: 'LD', width: 4, year,
    seed: async () => {
      const docs = await LoadingPanel.find({ companyId, vehicleArrivalNo: re }).select('vehicleArrivalNo').lean();
      return docs.reduce((max, d) => Math.max(max, Number(d.vehicleArrivalNo.match(re)[1]) || 0), 0);
    },
  });
}

const LoadingCounter = mongoose.models.LoadingCounter ||
  mongoose.model('LoadingCounter', loadingCounterSchema);

export default LoadingCounter;