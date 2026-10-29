// models/project/NotificationModel.js
import mongoose from "mongoose";
import { stampActivityEvents } from '@/lib/notificationActivityPolicy.mjs';

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    type: {
      type: String,
      // ✅ Add valid values
      required: true,
    },
    message: { type: String, required: true },
    role: { type: String,   },
    read: { type: Boolean, default: false },
    eventId: String,
    url: { type: String, default: '/admin' },
    reference: { type: String, default: '' },
    reminderKey: String,
    billingGroupKey: String,
    billingLrIds: [{ type: mongoose.Schema.Types.ObjectId }],
    resolvedAt: Date,
    moduleName: { type: String, default: '' },
    requiredAction: { type: String, default: 'view' },
    branchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    // Only newly created documents are queued; existing inbox history is not pushed.
    pushState: { type: String, enum: ['pending', 'sending', 'sent', 'skipped', 'failed'], default: 'pending' },
    pushAttempts: { type: Number, default: 0 },
    pushNextAttemptAt: { type: Date, default: Date.now },
    pushLeaseUntil: Date,
    subCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCompany', default: null },
    sourceModel: { type: String, default: '' },
    sourceRecordId: { type: String, default: '' },
  },
  { timestamps: true }
);

NotificationSchema.index({ pushState: 1, pushNextAttemptAt: 1 });
NotificationSchema.index({ company: 1, assignedTo: 1, createdAt: -1 });
NotificationSchema.index({ company: 1, _id: -1 });
NotificationSchema.index({ company: 1, eventId: 1 });
NotificationSchema.index({ reminderKey: 1 }, { unique: true, partialFilterExpression: { reminderKey: { $type: 'string' } } });
NotificationSchema.pre('insertMany', function (next, docs) { stampActivityEvents(docs); next(); });
NotificationSchema.pre('validate', function () { stampActivityEvents([this]); });

// Helpdesk has a different Notification schema. Use an independent model name
// while retaining the existing inbox collection and all its history.
export default mongoose.models.ERPNotification ||
  mongoose.model("ERPNotification", NotificationSchema, 'notifications');




// import mongoose from "mongoose";

// const NotificationSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser", required: true },
//   type: { type: String, enum: ["task-assigned", "comment", "due-reminder"], required: true },
//   message: { type: String, required: true },
//   read: { type: Boolean, default: false }
// }, { timestamps: true });

// export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
