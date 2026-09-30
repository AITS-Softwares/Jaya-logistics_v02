import mongoose from 'mongoose';
import { nextCompanyDocumentNumber } from '@/lib/documentSequence';
import { nextSimpleDocumentNumber } from '@/lib/documentSequence';

const orderPanelCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true
  },
  sequence_value: {
    type: Number,
    default: 0
  }
});

const OrderPanelCounter = mongoose.models.OrderPanelCounter || mongoose.model('OrderPanelCounter', orderPanelCounterSchema);

// Function to get next order panel number
// export async function getNextOrderPanelNumber(companyId, subCompanyId, subCompanyCode) {
//   return nextCompanyDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'ORD', width: 5 });
// }

export async function getNextOrderPanelNumber(companyId, subCompanyId, subCompanyCode) {
  return nextSimpleDocumentNumber({ companyId, subCompanyId, subCompanyCode, documentType: 'OP', width: 4 });
}

export default OrderPanelCounter;
