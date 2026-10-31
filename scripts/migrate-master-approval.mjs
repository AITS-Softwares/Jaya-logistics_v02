// Raw, missing-only updates: does not import schemas or read app environment.
import mongoose from 'mongoose';
const args=process.argv.slice(2);
const database=args.find(arg=>arg.startsWith('--db='))?.slice(5);
const apply=args.includes('--apply');
const only=args.find(arg=>arg.startsWith('--only='))?.slice(7);
if(only && !['suppliers','ratemasters'].includes(only)) throw new Error('--only must be suppliers or ratemasters.');
const collections=only?[only]:['suppliers','ratemasters'];
if(!database || !process.env.MASTER_APPROVAL_MONGO_URI) throw new Error('Set MASTER_APPROVAL_MONGO_URI and pass --db=EXACT_DATABASE. Omit --apply for dry-run.');
try {
  await mongoose.connect(process.env.MASTER_APPROVAL_MONGO_URI,{dbName:database,serverSelectionTimeoutMS:10000,connectTimeoutMS:10000});
  console.log(`Database: ${mongoose.connection.name}; mode: ${apply?'APPLY':'DRY RUN'}`);
  if(collections.includes('suppliers')) {
  const suppliers=mongoose.connection.db.collection('suppliers');
  const duplicates=await suppliers.aggregate([{$group:{_id:{companyId:'$companyId',code:'$supplierCode'},count:{$sum:1}}},{$match:{count:{$gt:1}}},{$limit:5}]).toArray();
  if(duplicates.length) throw new Error('Duplicate supplier codes exist within a company. Resolve these before migration; no records have been changed.');
  }
  for(const name of collections) {
    const collection=mongoose.connection.db.collection(name);
    const total=await collection.countDocuments({});
    const missing=await collection.countDocuments({approvalStatus:{$exists:false}});
    const invalid=await collection.countDocuments({approvalStatus:{$exists:true,$nin:['Approved','Pending','Rejected']}});
    console.log(`${name}: ${missing} missing, ${total-missing} skipped, ${invalid} invalid statuses requiring review`);
    if(apply && missing) {
      const now=new Date();
      const result=await collection.updateMany({approvalStatus:{$exists:false}},{$set:{approvalStatus:'Approved',approvalVersion:0,pendingChange:null},$push:{approvalLog:{action:'GRANDFATHERED',at:now,remark:'Existing master retained at approval workflow launch; no human review implied.',changedFields:[]}}});
      console.log(`${name}: updated ${result.modifiedCount}`);
    }
    if(apply && name==='suppliers') {
      await collection.updateMany({reservedSupplierCode:{$exists:false}},[{$set:{reservedSupplierCode:{$ifNull:['$pendingChange.data.supplierCode','$supplierCode']}}}]);
      await collection.createIndex({companyId:1,supplierCode:1},{unique:true});
      await collection.createIndex({companyId:1,reservedSupplierCode:1},{unique:true,partialFilterExpression:{reservedSupplierCode:{$type:'string'}}});
    }
  }
} finally {await mongoose.disconnect();}
