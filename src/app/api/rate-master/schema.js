// import mongoose from 'mongoose';

// const locationRateSchema = new mongoose.Schema({
//   locationId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Location',
//     required: true
//   },
//   fromQty: {
//     type: Number,
//     required: true
//   },
//   toQty: {
//     type: Number,
//     required: true
//   },
//   rate: {
//     type: Number,
//     required: true
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   version: {
//     type: Number,
//     default: 1
//   }
// });

// const rateMasterSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   customerId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer',
//     required: true
//   },
//   branchId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Branch',
//     required: true
//   },
//   locationRates: [locationRateSchema],
//  weightRule: {
//   type: String,
//   enum: ['above_25', 'below_25', 'all_weights', 'custom'],
//   default: 'all_weights'
// },
// customWeightRule: {
//   type: String,
//   trim: true,
//   default: ''
// },
//   approvalOption: {
//     type: String,
//     enum: ['contract_rate', 'mail_approval'],
//     required: true
//   },
//   companyId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Company',
//     required: true
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'CompanyUser'
//   },
//   isActive: {
//     type: Boolean,
//     default: true
//   }
// }, {
//   timestamps: true
// });

// rateMasterSchema.index({ companyId: 1, title: 1 }, { unique: true });

// const RateMaster = mongoose.models.RateMaster || mongoose.model('RateMaster', rateMasterSchema);

// export default RateMaster;

import mongoose from 'mongoose';

const locationRateSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  fromQty: {
    type: Number,
    required: true
  },
  toQty: {
    type: Number,
    required: true
  },
  rate: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
});

const rateMasterSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  locationRates: [locationRateSchema],
  weightRule: {
    type: String,
    enum: ['above_25', 'below_25', 'all_weights', 'custom'],
    default: 'all_weights'
  },
  customWeightRule: {
    type: String,
    trim: true,
    default: ''
  },
  customRuleType: {
    type: String,
    enum: ['above', 'below', 'between', ''],
    default: ''
  },
  customRuleLimit: {
    type: Number,
    default: null
  },
  customRuleToLimit: {
    type: Number,
    default: null
  },
  approvalOption: {
    type: String,
    enum: ['contract_rate', 'mail_approval'],
    required: true
  },
  // NEW: File upload fields
  approvalFile: {
    fileName: {
      type: String,
      default: ''
    },
    filePath: {
      type: String,
      default: ''
    },
    fileType: {
      type: String,
      default: ''
    },
    fileSize: {
      type: Number,
      default: 0
    },
    uploadedAt: {
      type: Date,
      default: null
    }
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyUser'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

rateMasterSchema.index({ companyId: 1, title: 1 }, { unique: true });

const RateMaster = mongoose.models.RateMaster || mongoose.model('RateMaster', rateMasterSchema);

export default RateMaster;