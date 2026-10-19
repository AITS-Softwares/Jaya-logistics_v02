import mongoose from 'mongoose';
import { nextPeriodDocumentNumber } from '@/lib/documentSequence';

const vehicleNegotiationCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    default: 0
  }
});

const VehicleNegotiationCounter = mongoose.models.VehicleNegotiationCounter || 
  mongoose.model('VehicleNegotiationCounter', vehicleNegotiationCounterSchema);

// Function to get next vehicle negotiation number
export async function getNextVehicleNegotiationNumber(companyId, subCompanyId, subCompanyCode) {
  return nextPeriodDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'VNN', width: 4 });
}

export default VehicleNegotiationCounter;
