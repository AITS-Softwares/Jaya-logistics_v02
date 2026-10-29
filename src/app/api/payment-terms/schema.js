import mongoose from 'mongoose';

const paymentTermsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // These are the minimum structured values ERPNext needs to generate an
    // invoice payment schedule. Existing terms safely behave as "due now".
    invoicePortion: {
      type: Number,
      min: 100,
      max: 100,
      default: 100,
    },

    dueDateBasedOn: {
      type: String,
      enum: [
        'Day(s) after invoice date',
        'Day(s) after the end of the invoice month',
        'Month(s) after the end of the invoice month',
      ],
      default: 'Day(s) after invoice date',
    },

    creditDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    creditMonths: {
      type: Number,
      min: 0,
      default: 0,
    },

    frappeSync: {
      status: {
        type: String,
        enum: ['pending', 'synced', 'failed', 'not_configured'],
        default: 'pending',
      },
      paymentTermName: String,
      templateName: String,
      message: String,
      attemptedAt: Date,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CompanyUser',
    },
  },
  {
    timestamps: true,
  }
);

paymentTermsSchema.index(
  {
    companyId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

export default mongoose.models.PaymentTerms ||
  mongoose.model('PaymentTerms', paymentTermsSchema);
