/** Adds reapproval metadata without changing any panel's existing status fields. */
export default function reapprovalPlugin(schema) {
  schema.add({
    reapprovalState: {
      type: String,
      enum: ['none', 'unlocked', 'pendingApproval', 'pendingReapproval', 'blockedByUpstream', 'syncFailed'],
      default: 'none',
      index: true,
    },
    approvedRevision: { type: Number, default: 0, min: 0 },
    approvedSnapshot: { type: schema.base.Schema.Types.Mixed, default: null },
    unlockedBy: { type: schema.base.Schema.Types.ObjectId, ref: 'CompanyUser', default: null },
    unlockedAt: { type: Date, default: null },
    unlockReason: { type: String, default: '' },
    sourceDependencies: { type: [schema.base.Schema.Types.Mixed], default: [] },
    upstreamPending: { type: [schema.base.Schema.Types.Mixed], default: [] },
    pendingChanges: { type: [schema.base.Schema.Types.Mixed], default: [] },
    pendingStateBeforeBlock: { type: String, default: '' },
    reapprovalHistory: { type: [schema.base.Schema.Types.Mixed], default: [] },
    reapprovalSyncError: { type: String, default: '' },
  });
}
