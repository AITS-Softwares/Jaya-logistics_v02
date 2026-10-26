/**
 * Shared soft-delete middleware for the logistics documents.
 * Reads omit deleted documents by default. Administrative inspection and
 * restore code must opt in with { includeDeleted: true }.
 */
export default function softDeletePlugin(schema) {
  schema.add({
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
    schema.pre(hook, function softDeleteWrite(next) {
      if (!this.getOptions().includeDeleted) this.where({ isDeleted: { $ne: true } });
      next();
    });
  }

  schema.pre('save', function preventSaveOfDeleted(next) {
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
