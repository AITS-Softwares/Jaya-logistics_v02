
// import mongoose from 'mongoose';

// // Address Schema for Consignor/Consignee
// const addressSchema = new mongoose.Schema({
//   name: { type: String, default: '' },
//   address: { type: String, default: '' },
//   customerId: { type: String, default: '' },
//   selectedAddressTitle: { type: String, default: '' }
// }, { _id: false });

// // Invoice Schema
// const invoiceSchema = new mongoose.Schema({
//   boeInvoice: { 
//     type: String, 
//     enum: ['As Per Invoice', 'As Per Bill Of Entry', 'NA'], 
//     default: 'As Per Invoice' 
//   },
//   boeInvoiceNo: { type: String, default: '' },
//   boeInvoiceDate: { type: String, default: '' },
//   invoiceValue: { type: String, default: '' }
// }, { _id: false });

// // E-waybill Schema
// const ewaybillSchema = new mongoose.Schema({
//   ewaybillNo: { type: String, default: '' },
//   expiryDate: { type: String, default: '' },
//   containerNo: { type: String, default: '' }
// }, { _id: false });

// // Pack Data Schema for different pack types
// const packDataItemSchema = new mongoose.Schema({
//   _id: { type: String, required: true },
//   packType: { type: String, enum: ['PALLETIZATION', 'UNIFORM - BAGS/BOXES', 'LOOSE - CARGO', 'NON-UNIFORM - GENERAL CARGO'] },
  
//   // Palletization fields
//   noOfPallets: { type: String, default: '' },
//   unitPerPallets: { type: String, default: '' },
//   totalPkgs: { type: String, default: '' },
//   pkgsType: { type: String, default: '' },
//   uom: { type: String, default: 'MT' },
//   skuSize: { type: String, default: '' },
//   packWeight: { type: String, default: '' },
//   productName: { type: String, default: '' },
//   wtLtr: { type: String, default: '' },
//   actualWt: { type: String, default: '' },
//   chargedWt: { type: String, default: '' },
//   wtUom: { type: String, default: 'MT' },
  
//   // Uniform fields
//   // (same as above, using same fields)
  
//   // Loose Cargo fields
//   // (using uom, productName, actualWt, chargedWt)
  
//   // Non-Uniform fields
//   nos: { type: String, default: '' },
//   length: { type: String, default: '' },
//   width: { type: String, default: '' },
//   height: { type: String, default: '' }
// }, { _id: false });

// // Pack Data wrapper
// const packDataSchema = new mongoose.Schema({
//   PALLETIZATION: [packDataItemSchema],
//   'UNIFORM - BAGS/BOXES': [packDataItemSchema],
//   'LOOSE - CARGO': [packDataItemSchema],
//   'NON-UNIFORM - GENERAL CARGO': [packDataItemSchema]
// }, { _id: false });

// const consignmentNoteSchema = new mongoose.Schema({
//   lrNo: {
//     type: String,
//     unique: true,
//     required: true,
//     index: true
//   },
  
//   // Reference fields
//   vnnNo: {
//     type: String,
//     default: '',
//     index: true,
//     sparse: true
//   },
  
//   vehicleNegotiationRef: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'VehicleNegotiation',
//     index: true,
//     sparse: true
//   },
  
//   loadingInfoNo: {
//     type: String,
//     default: '',
//     index: true
//   },
  
//   // Header Information
//   header: {
//     orderNo: { type: String, default: '' },
//     partyName: { type: String, default: '' },
//     orderType: { type: String, enum: ['Sales', 'STO Order', 'Export', 'Import'], default: 'Sales' },
//     plantCode: { type: String, default: '' },
//     plantName: { type: String, default: '' },
//     hiredOwned: { type: String, enum: ['Hired', 'Owned'], default: 'Hired' },
//     vendorCode: { type: String, default: '' },
//     vendorName: { type: String, default: '' },
//     from: { type: String, default: '' },
//     to: { type: String, default: '' },
//     taluka: { type: String, default: '' },
//     district: { type: String, default: '' },
//     state: { type: String, default: '' },
//     vehicleNo: { type: String, default: '' },
//     partyNo: { type: String, default: '' },
//     lrNo: { type: String, default: '' },
//     lrDate: { type: String, default: '' },
//     unit: { type: String, enum: ['MT', 'KG', 'LTR', 'TON', 'M3', 'PCS'], default: 'MT' },
//     status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Draft'], default: 'Pending' }
//   },

//   // Consignor Information
//   consignor: addressSchema,

//   // Consignee Information
//   consignee: addressSchema,

//   // Invoice Information
//   invoice: invoiceSchema,

//   // E-waybill Information
//   ewaybill: ewaybillSchema,

//   // Pack Data (all pack types)
//   packData: packDataSchema,

//   // Total Weight Calculation
//   totalWeight: {
//     type: Number,
//     default: 0
//   },

//   // Company & User Tracking
//   companyId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Company',
//     required: true,
//     index: true
//   },

//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'CompanyUser'
//   },

//   createdAt: {
//     type: Date,
//     default: Date.now
//   },

//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// }, { timestamps: true });

// // Pre-save middleware
// consignmentNoteSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
  
//   // Calculate total weight from all pack types
//   let total = 0;
  
//   // Palletization
//   if (this.packData?.PALLETIZATION) {
//     this.packData.PALLETIZATION.forEach(row => {
//       total += parseFloat(row.actualWt) || 0;
//     });
//   }
  
//   // Uniform
//   if (this.packData?.['UNIFORM - BAGS/BOXES']) {
//     this.packData['UNIFORM - BAGS/BOXES'].forEach(row => {
//       total += parseFloat(row.actualWt) || 0;
//     });
//   }
  
//   // Loose Cargo
//   if (this.packData?.['LOOSE - CARGO']) {
//     this.packData['LOOSE - CARGO'].forEach(row => {
//       total += parseFloat(row.actualWt) || 0;
//     });
//   }
  
//   // Non-Uniform
//   if (this.packData?.['NON-UNIFORM - GENERAL CARGO']) {
//     this.packData['NON-UNIFORM - GENERAL CARGO'].forEach(row => {
//       total += parseFloat(row.actualWt) || 0;
//     });
//   }
  
//   this.totalWeight = total;
  
//   next();
// });

// const ConsignmentNote = mongoose.models.ConsignmentNote || 
//   mongoose.model('ConsignmentNote', consignmentNoteSchema);

// export default ConsignmentNote;

import mongoose from 'mongoose';

// Address Schema for Consignor/Consignee
const addressSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  address: { type: String, default: '' },
  customerId: { type: String, default: '' },
  selectedAddressTitle: { type: String, default: '' }
}, { _id: false });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  boeInvoice: { 
    type: String, 
    enum: ['As Per Invoice', 'As Per Bill Of Entry', 'NA'], 
    default: 'As Per Invoice' 
  },
  boeInvoiceNo: { type: String, default: '' },
  boeInvoiceDate: { type: String, default: '' },
  invoiceValue: { type: String, default: '' }
}, { _id: false });

// E-waybill Schema
const ewaybillSchema = new mongoose.Schema({
  ewaybillNo: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  containerNo: { type: String, default: '' }
}, { _id: false });

// Pack Data Schema for different pack types
const packDataItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  packType: { type: String, enum: ['PALLETIZATION', 'UNIFORM - BAGS/BOXES', 'LOOSE - CARGO', 'NON-UNIFORM - GENERAL CARGO'] },
  
  // Palletization fields
  noOfPallets: { type: String, default: '' },
  unitPerPallets: { type: String, default: '' },
  totalPkgs: { type: String, default: '' },
  pkgsType: { type: String, default: '' },
  uom: { type: String, default: 'MT' },
  skuSize: { type: String, default: '' },
  packWeight: { type: String, default: '' },
  productName: { type: String, default: '' },
  wtLtr: { type: String, default: '' },
  actualWt: { type: String, default: '' },
  chargedWt: { type: String, default: '' },
  wtUom: { type: String, default: 'MT' },
  
  // Uniform fields
  // (same as above, using same fields)
  
  // Loose Cargo fields
  // (using uom, productName, actualWt, chargedWt)
  
  // Non-Uniform fields
  nos: { type: String, default: '' },
  length: { type: String, default: '' },
  width: { type: String, default: '' },
  height: { type: String, default: '' }
}, { _id: false });

// Pack Data wrapper
const packDataSchema = new mongoose.Schema({
  PALLETIZATION: [packDataItemSchema],
  'UNIFORM - BAGS/BOXES': [packDataItemSchema],
  'LOOSE - CARGO': [packDataItemSchema],
  'NON-UNIFORM - GENERAL CARGO': [packDataItemSchema]
}, { _id: false });

const consignmentNoteSchema = new mongoose.Schema({
  lrNo: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  // Reference fields
  vnnNo: {
    type: String,
    default: '',
    index: true,
    sparse: true
  },
  
  vehicleNegotiationRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleNegotiation',
    index: true,
    sparse: true
  },
  
  loadingInfoNo: {
    type: String,
    default: '',
    index: true
  },
  
  // LC Status
  lcStatus: {
    type: String,
    enum: ['LC', 'Not LC'],
    default: 'Not LC'
  },
  
  // LR Type
  lrType: {
    type: String,
    enum: ['Export', 'Import', 'Normal'],
    default: 'Normal'
  },
  
  // Vehicle Reach
  vehicleReach: {
    type: String,
    enum: ['Reach', 'Not Reach'],
    default: 'Not Reach'
  },
  
  // Verification
  verification: {
    type: String,
    enum: ['Verified', 'Not Verified'],
    default: 'Not Verified'
  },
  
  // Vehicle Unloaded Date
  vehicleUnloadedDate: {
    type: String,
    default: ''
  },
  
  // Remarks
  remarks: {
    type: String,
    default: ''
  },
    subCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCompany',
    required: false
  },
  subCompanyName: {
    type: String,
    default: ''
  },
  subCompanyCode: {
    type: String,
    default: ''
  },

  // Header Information
  header: {
    orderNo: { type: String, default: '' },
    partyName: { type: String, default: '' },
    orderType: { type: String, enum: ['Sales', 'STO Order', 'Export', 'Import'], default: 'Sales' },
    plantCode: { type: String, default: '' },
    plantName: { type: String, default: '' },
    hiredOwned: { type: String, enum: ['Hired', 'Owned'], default: 'Hired' },
    vendorCode: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    from: { type: String, default: '' },
    fromState: { type: String, default: '' },
    to: { type: String, default: '' },
    taluka: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    partyNo: { type: String, default: '' },
    lrNo: { type: String, default: '' },
    lrDate: { type: String, default: '' },
    unit: { type: String, enum: ['MT', 'KG', 'LTR', 'TON', 'M3', 'PCS'], default: 'MT' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Completed', 'Draft'], default: 'Pending' },
    lcStatus: { type: String, enum: ['LC', 'Not LC'], default: 'Not LC' },
    lrType: { type: String, enum: ['Export', 'Import', 'Normal'], default: 'Normal' },
    vehicleReach: { type: String, enum: ['Reach', 'Not Reach'], default: 'Not Reach' },
    verification: { type: String, enum: ['Verified', 'Not Verified'], default: 'Not Verified' },
    vehicleUnloadedDate: { type: String, default: '' },
    remarks: { type: String, default: '' }
  },

  // Consignor Information
  consignor: addressSchema,

  // Consignee Information
  consignee: addressSchema,

  // Invoice Information
  invoice: invoiceSchema,

  // E-waybill Information
  ewaybill: ewaybillSchema,

  // Pack Data (all pack types)
  packData: packDataSchema,

  // Total Weight Calculation
  totalWeight: {
    type: Number,
    default: 0
  },

  // Company & User Tracking
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyUser'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware
consignmentNoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total weight from all pack types
  let total = 0;
  
  // Palletization
  if (this.packData?.PALLETIZATION) {
    this.packData.PALLETIZATION.forEach(row => {
      total += parseFloat(row.actualWt) || 0;
    });
  }
  
  // Uniform
  if (this.packData?.['UNIFORM - BAGS/BOXES']) {
    this.packData['UNIFORM - BAGS/BOXES'].forEach(row => {
      total += parseFloat(row.actualWt) || 0;
    });
  }
  
  // Loose Cargo
  if (this.packData?.['LOOSE - CARGO']) {
    this.packData['LOOSE - CARGO'].forEach(row => {
      total += parseFloat(row.actualWt) || 0;
    });
  }
  
  // Non-Uniform
  if (this.packData?.['NON-UNIFORM - GENERAL CARGO']) {
    this.packData['NON-UNIFORM - GENERAL CARGO'].forEach(row => {
      total += parseFloat(row.actualWt) || 0;
    });
  }
  
  this.totalWeight = total;
  
  next();
});

const ConsignmentNote = mongoose.models.ConsignmentNote || 
  mongoose.model('ConsignmentNote', consignmentNoteSchema);

export default ConsignmentNote;