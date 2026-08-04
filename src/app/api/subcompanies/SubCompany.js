// src/models/SubCompany.js
import mongoose from 'mongoose';

const subCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
subCompanySchema.index({ code: 1 });
subCompanySchema.index({ companyId: 1 });
subCompanySchema.index({ companyId: 1, name: 1 });

const SubCompany = mongoose.models.SubCompany || mongoose.model('SubCompany', subCompanySchema);

export default SubCompany;