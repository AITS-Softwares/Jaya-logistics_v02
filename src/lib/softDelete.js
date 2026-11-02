/**
 * Shared soft-delete middleware for the logistics documents.
 * Reads omit deleted documents by default. Administrative inspection and
 * restore code must opt in with { includeDeleted: true }.
 */
export default function softDeletePlugin(schema) {
  schema.add({
    cancellation: { type: schema.base.Schema.Types.Mixed, default: null },
    cancellationRepair: { type: schema.base.Schema.Types.Mixed, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: schema.base.Schema.Types.ObjectId, default: null },
    deleteReason: { type: String, default: '' },
    deleteBatchId: { type: String, default: null, index: true },
    deleteRootType: { type: String, default: null },
    deleteRootNo: { type: String, default: null },
    statusBeforeDelete: { type: String, default: null },
    deletedOrderRowId: { type: String, default: '' },
  });

  for (const key of ['orders', 'orderRows']) {
    const rowSchema = schema.path(key)?.schema;
    if (rowSchema) rowSchema.add({ cancellationStatus: { type: String, default: '' } });
  }

  const readHooks = ['find', 'findOne', 'countDocuments', 'distinct'];
  for (const hook of readHooks) {
    schema.pre(hook, function softDeleteRead(next) {
      if (!this.getOptions().includeDeleted) {
        this.where({ isDeleted: { $ne: true } });
      }
      next();
    });
  }

  schema.pre('aggregate', function softDeleteAggregate(next) {
    if (!this.options.includeDeleted) this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    next();
  });

  for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne']) {
    schema.pre(hook, async function preventCancelledProgression() {
      if (this.getOptions().allowCancellationWrite) return;
      const blocked = await this.model.findOne({ $and: [this.getQuery(), { 'cancellation.state': { $in: ['cancelled', 'review'] } }] }).session(this.getOptions().session || null).select('_id').lean();
      if (blocked) throw Object.assign(new Error('A linked order is cancelled. Normal editing and progression are blocked.'), { status: 409 });
    });
    schema.pre(hook, function softDeleteWrite(next) {
      if (!this.getOptions().includeDeleted) this.where({ isDeleted: { $ne: true } });
      next();
    });
  }

  schema.pre('save', function preventSaveOfDeleted(next) {
    if (['cancelled', 'review'].includes(this.cancellation?.state) && !this.$locals.allowCancellationWrite) {
      return next(Object.assign(new Error('This record contains cancelled orders. Normal editing and progression are blocked; review the cancellation first.'), { status: 409 }));
    }
    if (this.isDeleted && !this.$locals.allowDeletedWrite) {
      return next(new Error('This record is deleted and must be restored before it can be edited.'));
    }
    next();
  });

  for (const hook of ['deleteOne', 'deleteMany', 'findOneAndDelete']) {
    schema.pre(hook, function preventHardDelete(next) {
      if (!this.getOptions().allowHardDelete) {
        return next(new Error('Hard deletion is disabled for logistics records.'));
      }
      next();
    });
  }
}
