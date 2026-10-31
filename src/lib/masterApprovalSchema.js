import mongoose from 'mongoose';
export function addMasterApprovalFields(schema) {
  const actor = new mongoose.Schema({accountType:{type:String,enum:['company','companyUser']},accountId:mongoose.Schema.Types.ObjectId},{_id:false});
  // Operational readers receive approved live records by default. Master
  // management and uniqueness checks must opt in explicitly on the server.
  schema.pre(['find','findOne'],function() {
    if(this.getOptions().includeUnapprovedMasters === true) return;
    this.where({approvalStatus:'Approved'});
    if (!Object.values(this.projection() || {}).some(value=>value===1)) this.select('-pendingChange -lastRejectedProposal -approvalLog -reservedSupplierCode');
  });
  schema.add({
    approvalStatus:{type:String,enum:['Pending','Approved','Rejected'],default:'Pending',index:true},
    approvalVersion:{type:Number,default:0}, revisionId:String,
    submittedBy:actor,approvedBy:actor,rejectedBy:actor,
    submittedAt:Date,approvedAt:Date,rejectedAt:Date,rejectionReason:{type:String,default:''},
    pendingChange:{type:new mongoose.Schema({revisionId:String,baseVersion:Number,data:mongoose.Schema.Types.Mixed,requestedBy:actor,requestedAt:Date},{_id:false}),default:null},
    lastRejectedProposal:{type:mongoose.Schema.Types.Mixed,default:null},
    approvalLog:{type:[new mongoose.Schema({action:{type:String,enum:['SUBMITTED','APPROVED','REJECTED','SUPERSEDED','GRANDFATHERED','LEGACY_APPROVED']},revisionId:String,by:actor,at:Date,remark:String,changedFields:[String]},{_id:false})],default:[]}
  });
}
