// // /models/PricingPanel.js
// import mongoose from 'mongoose';

// const pricingPanelSchema = new mongoose.Schema({
//   // Auto-generated pricing serial number
//   pricingSerialNo: {
//     type: String,
//     unique: true,
//     required: true,
//     index: true
//   },
  
//   // Header Information
//   branch: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Branch'
//   },
//   branchName: String,
//   branchCode: String,
//   delivery: {
//     type: String,
//     enum: ['Urgent', 'Normal', 'Express', 'Scheduled'],
//     default: 'Normal'
//   },
//   date: {
//     type: Date,
//     default: Date.now
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer'
//   },
//   partyName: String,
  
//   // Billing Information
//   billingType: {
//     type: String,
//     enum: ['Single - Order', 'Multi - Order'],
//     default: 'Multi - Order'
//   },
//   loadingPoints: {
//     type: Number,
//     default: 1
//   },
//   dropPoints: {
//     type: Number,
//     default: 1
//   },
//   collectionCharges: {
//     type: Number,
//     default: 0
//   },
//   cancellationCharges: {
//     type: String,
//     default: 'Nil'
//   },
//   loadingCharges: {
//     type: String,
//     default: 'Nil'
//   },
//   otherCharges: {
//     type: String,
//     default: 'Nil'
//   },
  
//   // Orders Data - Now linked to Vehicle Negotiation
//  // In /models/PricingPanel.js - update orders array
// orders: [{
//   _id: {
//     type: mongoose.Schema.Types.ObjectId,
//     default: () => new mongoose.Types.ObjectId()
//   },
//   orderNo: String,
//   vehicleNegotiationId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'VehicleNegotiation'
//   },
//   partyName: String,
//   customerId: mongoose.Schema.Types.ObjectId,
//   customerCode: String,
//   contactPerson: String,
//   plantCode: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Plant'
//   },
//   plantName: String,
//   plantCodeValue: String,
//   orderType: {
//     type: String,
//     enum: ['Sales', 'STO Order', 'Export', 'Import'],
//     default: 'Sales'
//   },
//   pinCode: String,
//   country: String,
//   countryName: String,
//   state: String,
//   stateName: String,
//   stateId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'State'
//   },
//   district: String,
//   districtName: String,
//   districtId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'District'
//   },
//   taluka: String,
//   talukaName: String,
//   talukaId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Taluka'
//   },
//   from: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Branch'
//   },
//   fromName: String,
//   fromState: { type: String, default: '' }, // ✅ ADD THIS
//   to: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Branch'
//   },
//   toName: String,
//   locationRate: {
//     type: String,
//     default: ''
//   },
//   priceList: String,
//   weight: {
//     type: Number,
//     default: 0
//   },
//   rate: {
//     type: Number,
//     default: 0
//   },
//   totalAmount: {
//     type: Number,
//     default: 0
//   },
//     subCompanyId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'SubCompany',
//       required: false
//     },
//     subCompanyName: {
//       type: String,
//       default: ''
//     },
//     subCompanyCode: {
//       type: String,
//       default: ''
//     },
//   // ✅ ADD LOCAL STATUS FIELDS
//   localStatus: {
//     type: String,
//     enum: ['local', 'not-local', 'unknown'],
//     default: 'unknown'
//   },
//   localStatusLabel: {
//     type: String,
//     enum: ['Local', 'Not Local', 'Unknown'],
//     default: 'Unknown'
//   }
// }],
  
//   // Totals
//   totalWeight: {
//     type: Number,
//     default: 0
//   },
//   totalAmount: {
//     type: Number,
//     default: 0
//   },
  
//   // Rate Approval
//   rateApproval: {
//     approvalType: {
//       type: String,
//       enum: ['Contract Rates', 'Mail Approval Rate'],
//       default: 'Contract Rates'
//     },
//     uploadFile: String,
    
//     approvalStatus: {
//   type: String,
//   enum: ['Pending', 'Pending from Team', 'Pending from Client', 'Approved', 'Rejected', 'Completed'],
//   default: 'Pending'
// }
//   },
  
//   // Report Data
//   reportRows: [{
//     _id: {
//       type: mongoose.Schema.Types.ObjectId,
//       default: () => new mongoose.Types.ObjectId()
//     },
//     date: Date,
//     pricingSerialNo: String,
//     order: String,
//     partyName: String,
//     plantCode: String,
//     orderType: String,
//     pinCode: String,
//     taluka: String,
//     state: String,
//     district: String,
//     from: String,
//     to: String,
//     weight: Number,
//     pricing: {
//       type: String,
//       enum: ['Pending', 'Completed'],
//       default: 'Pending'
//     },
//     approval: {
//       type: String,
//       enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
//       default: 'Pending'
//     }
//   }],
  
//   // Company & User Tracking
//   companyId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Company',
//     required: true
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'CompanyUser'
//   },
  
//   // Status
//   panelStatus: {
//     type: String,
//     enum: ['Draft', 'Submitted', 'Approved', 'Completed', 'Cancelled'],
//     default: 'Draft'
//   },
//   status: {
//     type: String,
//     enum: ['Active', 'Inactive'],
//     default: 'Active'
//   },
  
//   // Timestamps
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Calculate totals before saving
// pricingPanelSchema.pre('save', function(next) {
//   // Calculate totals from orders
//   this.totalWeight = this.orders.reduce((sum, order) => sum + (order.weight || 0), 0);
//   this.totalAmount = this.orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  
//   // Generate report rows from orders with taluka
//   this.reportRows = this.orders.map(order => ({
//     date: this.date,
//     pricingSerialNo: this.pricingSerialNo,
//     order: order.orderNo,
//     partyName: order.partyName || '-',
//     plantCode: order.plantName || '-',
//     orderType: order.orderType,
//     pinCode: order.pinCode || '-',
//     taluka: order.talukaName || order.taluka || '-',
//     state: order.stateName || '-',
//     district: order.districtName || '-',
//     from: order.fromName || '-',
//     to: order.toName || '-',
//     weight: order.weight || 0,
//     pricing: 'Pending',
//     approval: this.rateApproval.approvalStatus || 'Pending'
//   }));
  
//   this.updatedAt = Date.now();
//   next();
// });

// // Update timestamp on save
// pricingPanelSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// const PricingPanel = mongoose.models.PricingPanel || 
//   mongoose.model('PricingPanel', pricingPanelSchema);

// export default PricingPanel;

// models/PricingPanel.js
import mongoose from 'mongoose';

const pricingPanelSchema = new mongoose.Schema({
  // Auto-generated pricing serial number
  pricingSerialNo: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  // Header Information
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  branchName: String,
  branchCode: String,
  
  // ✅ ADD SUB-COMPANY FIELDS TO HEADER
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
  
  delivery: {
    type: String,
    enum: ['Urgent', 'Normal', 'Express', 'Scheduled'],
    default: 'Normal'
  },
  date: {
    type: Date,
    default: Date.now
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  partyName: String,
  
  // Billing Information
  billingType: {
    type: String,
    enum: ['Single - Order', 'Multi - Order'],
    default: 'Multi - Order'
  },
  loadingPoints: {
    type: Number,
    default: 1
  },
  dropPoints: {
    type: Number,
    default: 1
  },
  collectionCharges: {
    type: Number,
    default: 0
  },
  cancellationCharges: {
    type: String,
    default: 'Nil'
  },
  loadingCharges: {
    type: String,
    default: 'Nil'
  },
  otherCharges: {
    type: String,
    default: 'Nil'
  },
  
  // Orders Data
  orders: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    orderNo: String,
    vehicleNegotiationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VehicleNegotiation'
    },
    partyName: String,
    customerId: mongoose.Schema.Types.ObjectId,
    customerCode: String,
    contactPerson: String,
    plantCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plant'
    },
    plantName: String,
    plantCodeValue: String,
    orderType: {
      type: String,
      enum: ['Sales', 'STO Order', 'Export', 'Import'],
      default: 'Sales'
    },
    pinCode: String,
    country: String,
    countryName: String,
    state: String,
    stateName: String,
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State'
    },
    district: String,
    districtName: String,
    districtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District'
    },
    taluka: String,
    talukaName: String,
    talukaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Taluka'
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    fromName: String,
    fromState: { type: String, default: '' },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    toName: String,
    locationRate: {
      type: String,
      default: ''
    },
    locationRateId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    priceList: String,
    priceListId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RateMaster',
      default: null
    },
    rateCalculationMode: {
      type: String,
      enum: ['order_weight', 'total_weight', 'manual_rate'],
      default: 'order_weight'
    },
    weight: {
      type: Number,
      default: 0
    },
    rate: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    // Sub-Company fields for each order
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
    localStatus: {
      type: String,
      enum: ['local', 'not-local', 'unknown'],
      default: 'unknown'
    },
    localStatusLabel: {
      type: String,
      enum: ['Local', 'Not Local', 'Unknown'],
      default: 'Unknown'
    }
  }],
  
  // Totals
  totalWeight: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  
  // Rate Approval
  rateApproval: {
    approvalType: {
      type: String,
      enum: ['Contract Rates', 'Mail Approval Rate'],
      default: 'Contract Rates'
    },
    uploadFile: String,
    uploadFilePath: {
      type: String,
      default: ''
    },
    remarks: {
      type: String,
      default: ''
    },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Pending from Team', 'Pending from Client', 'Approved', 'Rejected', 'Completed'],
      default: 'Pending'
    },
    workflowPhase: {
      type: String,
      enum: ['part1', 'part2', 'locked'],
      default: 'part1'
    }
  },
  
  // Report Data - ADD SUB-COMPANY TO REPORT ROWS
  reportRows: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      default: () => new mongoose.Types.ObjectId()
    },
    date: Date,
    pricingSerialNo: String,
    order: String,
    partyName: String,
    plantCode: String,
    orderType: String,
    pinCode: String,
    taluka: String,
    state: String,
    district: String,
    from: String,
    to: String,
    weight: Number,
    pricing: {
      type: String,
      enum: ['Pending', 'Completed'],
      default: 'Pending'
    },
    approval: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
      default: 'Pending'
    },
    // ✅ ADD SUB-COMPANY TO REPORT ROWS
    subCompanyName: {
      type: String,
      default: ''
    },
    subCompanyCode: {
      type: String,
      default: ''
    }
  }],
  
  // Company & User Tracking
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyUser'
  },
  
  // Status
  panelStatus: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate totals before saving
pricingPanelSchema.pre('save', function(next) {
  // Calculate totals from orders
  this.totalWeight = this.orders.reduce((sum, order) => sum + (order.weight || 0), 0);
  this.totalAmount = this.orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  
  // Generate report rows from orders with sub-company
  this.reportRows = this.orders.map(order => ({
    date: this.date,
    pricingSerialNo: this.pricingSerialNo,
    order: order.orderNo,
    partyName: order.partyName || '-',
    plantCode: order.plantName || '-',
    orderType: order.orderType,
    pinCode: order.pinCode || '-',
    taluka: order.talukaName || order.taluka || '-',
    state: order.stateName || '-',
    district: order.districtName || '-',
    from: order.fromName || '-',
    to: order.toName || '-',
    weight: order.weight || 0,
    pricing: 'Pending',
    approval: this.rateApproval.approvalStatus || 'Pending',
    // ✅ ADD SUB-COMPANY TO REPORT ROWS
    subCompanyName: order.subCompanyName || this.subCompanyName || '',
    subCompanyCode: order.subCompanyCode || this.subCompanyCode || ''
  }));
  
  this.updatedAt = Date.now();
  next();
});

// Update timestamp on save
pricingPanelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PricingPanel = mongoose.models.PricingPanel || 
  mongoose.model('PricingPanel', pricingPanelSchema);

export default PricingPanel;
