import { branchContext, branchDenied } from './branchContext';
import { branchModels, key, makeOwnershipResolver, canAccessBranches, hasInaccessibleDependent } from './branchOwnership.mjs';

async function validateDocument(scope, name, doc, { existing = false } = {}) {
  const graph = await scope.load();
  if (key(doc.companyId) !== key(scope.user.companyId)) throw branchDenied();
  if (doc.subCompanyId && key(doc.subCompanyId) !== key(scope.user.activeOperatingCompanyId)) throw branchDenied();
  if (existing && !scope.access.accessAllBranches) {
    const saved = graph.lookup(name, doc._id);
    if (!saved || !canAccessBranches(scope.access, graph.resolve(name, saved))) throw branchDenied();
    if (hasInaccessibleDependent(graph, name, saved, scope.access)) throw branchDenied('A linked transaction spans branches outside your assignment. A user with access to all included branches must make this change.');
  }
  // Use a fresh resolver: a changed document shares its id with the saved row.
  const ownership = makeOwnershipResolver(graph)(name, doc);
  if (!canAccessBranches(scope.access, ownership)) throw branchDenied('Select a record from your assigned branches. Its source branch could not be verified.');
  if (!existing && ownership?.length > 1) throw branchDenied('New transactions must use orders from one owning branch.');
  if (!ownership?.length) {
    // All-branch users retain access to legacy records that need repair.
    // New non-draft records must have a resolvable source.
    if (!existing && (name === 'OrderPanel' || !doc.isDraft)) throw branchDenied('Select a valid owning branch on the Order and a linked source from the selected company.');
    return;
  }
  const branch = graph.branches.find(item => key(item._id) === ownership[0]);
  if (!existing && name === 'OrderPanel' && branch.isActive === false) throw branchDenied('Select an active branch for a new Order.');
  doc.owningBranchIds = ownership;
  const target = ['PurchasePanel', 'AdvancePayment', 'POD'].includes(name) ? doc.header : doc;
  if (name === 'OrderPanel' || ['VehicleNegotiation', 'PricingPanel', 'LoadingPanel', 'PurchasePanel', 'AdvancePayment'].includes(name)) {
    if (target) Object.assign(target, { branch: branch._id, branchName: branch.name, branchCode: branch.code });
  } else if (name === 'POD' && target) Object.assign(target, { branch: branch.name, branchCode: branch.code });
  else if (name === 'BalancePayment') Object.assign(doc, { branch: branch.name, branchCode: branch.code });
}

export default function branchScopePlugin(schema, { model } = {}) {
  schema.add({ owningBranchIds: [{ type: String }] });
  schema.pre(['find', 'findOne', 'countDocuments', 'distinct', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'], async function () {
    const scope = branchContext.getStore();
    if (!scope) return;
    const filter = await scope.filter(model);
    if (filter) this.setQuery({ $and: [this.getFilter(), filter] });
    const removing = /delete/i.test(this.op) || this.getUpdate()?.$set?.isDeleted === true;
    if (removing && !scope.access.accessAllBranches) {
      const graph = await scope.load();
      const docs = await branchContext.run(undefined, () => this.model.find(this.getFilter()).lean());
      if (docs.some(doc => hasInaccessibleDependent(graph, model, doc, scope.access))) throw branchDenied('A linked transaction spans branches outside your assignment.');
    }
    if (!/update|replace/i.test(this.op)) return;
    const update = this.getUpdate();
    if (!update) return;
    if (Array.isArray(update) || this.getOptions().upsert) throw branchDenied('Use the transaction form to create or change linked records.');
    // Validate replacements and changes to ownership-bearing fields before any
    // write. Non-ownership status/amount updates still receive the query scope.
    const roots = new Set(`${branchModels[model]?.select || ''} companyId subCompanyId owningBranchIds`.split(' ').map(path => path.split('.')[0]));
    const changes = Object.entries(update).flatMap(([op, value]) => op.startsWith('$') ? Object.keys(value || {}) : [op]);
    if (!/replace/i.test(this.op) && !changes.some(path => roots.has(path.split('.')[0]))) return;
    if (Object.keys(update).some(op => op.startsWith('$') && !['$set', '$unset', '$setOnInsert'].includes(op))) {
      throw branchDenied('Use the transaction form to change its linked sources.');
    }
    const docs = await branchContext.run(undefined, () => this.model.find(this.getFilter()).lean());
    if (docs.length > 1) throw branchDenied('Change linked sources on one transaction at a time.');
    for (const saved of docs) {
      const candidate = this.model.hydrate(saved);
      if (/replace/i.test(this.op)) {
        for (const path of Object.keys(saved)) if (path !== '_id') candidate.set(path, undefined);
      }
      const sets = update.$set || Object.fromEntries(Object.entries(update).filter(([path]) => !path.startsWith('$')));
      candidate.set(sets);
      for (const path of Object.keys(update.$unset || {})) candidate.set(path, undefined);
      await validateDocument(scope, model, candidate, { existing: true });
      // Downstream branch snapshots are derived, never accepted from a caller.
      for (const path of ['branch', 'branchName', 'branchCode', 'header.branch', 'header.branchName', 'header.branchCode', 'owningBranchIds']) {
        if (schema.path(path) && candidate.get(path) !== undefined) {
          if (!update.$set) update.$set = {};
          update.$set[path] = candidate.get(path);
          if (update.$unset) delete update.$unset[path];
        }
      }
    }
  });
  schema.pre('aggregate', async function () {
    const scope = branchContext.getStore();
    if (!scope) return;
    const filter = await scope.filter(model);
    if (filter) this.pipeline().splice(this.pipeline()[0]?.$geoNear || this.pipeline()[0]?.$search ? 1 : 0, 0, { $match: filter });
    // Protect joined transaction data too, should a report use a lookup or
    // union. A scope only on the outer collection would expose joined records.
    async function scopeStages(stages, connection) {
      for (const stage of stages) {
        for (const [operator, spec] of Object.entries(stage)) {
          if (operator === '$lookup' || operator === '$unionWith') {
            const collection = typeof spec === 'string' ? spec : spec.from || spec.coll;
            const joined = Object.values(connection.models).find(Model => branchModels[Model.modelName] && Model.collection.name === collection);
            if (joined) {
              const joinedFilter = await scope.filter(joined.modelName);
              if (typeof spec === 'string') stage[operator] = { coll: spec, pipeline: [{ $match: joinedFilter }] };
              else spec.pipeline = [{ $match: joinedFilter }, ...(spec.pipeline || [])];
            }
            if (typeof spec === 'object' && spec.pipeline) await scopeStages(spec.pipeline, connection);
          } else if (operator === '$facet') for (const child of Object.values(spec)) await scopeStages(child, connection);
        }
      }
    }
    await scopeStages(this.pipeline(), this._model.db);
  });
  schema.post(['find', 'findOne'], async function (result) {
    const scope = branchContext.getStore();
    if (!scope || ['SavedReport', 'DriverTrip', 'TrackingSession', 'LocationPoint', 'StopEpisode'].includes(model)) return;
    const docs = (Array.isArray(result) ? result : [result]).filter(Boolean);
    const displaysBranch = doc => {
      const target = ['PurchasePanel', 'AdvancePayment', 'POD'].includes(model) ? doc.header : doc;
      return target && (target.branch !== undefined || target.branchName !== undefined || target.branchCode !== undefined);
    };
    if (!docs.some(displaysBranch)) return;
    const graph = await scope.load();
    for (const doc of docs) {
      if (!displaysBranch(doc)) continue;
      const ownership = graph.resolve(model, graph.lookup(model, doc._id));
      if (ownership?.length !== 1) continue;
      const branch = graph.branches.find(item => key(item._id) === ownership[0]);
      const target = ['PurchasePanel', 'AdvancePayment', 'POD'].includes(model) ? doc.header : doc;
      if (['BalancePayment', 'POD'].includes(model)) target.branch = branch.name;
      else if (key(target.branch) !== ownership[0]) target.branch = branch._id;
      if ('branchName' in target) target.branchName = branch.name;
      target.branchCode = branch.code;
    }
  });
  schema.pre('save', async function () {
    const scope = branchContext.getStore();
    if (scope) await validateDocument(scope, model, this, { existing: !this.isNew });
  });
  schema.post('save', async function (doc) {
    const scope = branchContext.getStore();
    if (scope) (await scope.load()).remember(model, doc.toObject());
  });
  schema.pre('insertMany', async function (next, docs) {
    try {
      const scope = branchContext.getStore();
      if (scope) for (const doc of docs) await validateDocument(scope, model, doc);
      next();
    } catch (error) { next(error); }
  });
  schema.pre('bulkWrite', function (next) {
    next(branchContext.getStore() ? branchDenied('Use scoped transaction updates instead of bulk writes.') : undefined);
  });
}
