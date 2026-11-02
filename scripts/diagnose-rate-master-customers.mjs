// Read-only: shows saved customer references without modifying any record.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const {MongoClient,ObjectId}=require('mongodb');
const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');return [arg.slice(2,i),arg.slice(i+1)];}));
if(!args.db || !ObjectId.isValid(args['company-id']))throw new Error('Usage: node scripts/diagnose-rate-master-customers.mjs --db=jaya --company-id=<company ID>');
const uri=process.env.MONGODB_URI;
if(!uri)throw new Error('MONGODB_URI is required in the environment or .env.local.');
const client=new MongoClient(uri,{serverSelectionTimeoutMS:10000});
try {
  await client.connect();
  const db=client.db(args.db),companyId=new ObjectId(args['company-id']);
  const records=await db.collection('ratemasters').find({companyId},{projection:{title:1,customerId:1,usageMode:1}}).toArray();
  for(const record of records){
    if(record.usageMode==='manual_rate_default'){console.log(JSON.stringify({title:record.title,status:'ALL_CUSTOMERS'}));continue;}
    const id=record.customerId?._id || record.customerId;
    const customer=id?await db.collection('customers').findOne({_id:id,companyId},{projection:{customerName:1}}):null;
    // Identify imports with a string/ObjectId mismatch without changing links.
    const alternate=!customer && id && ObjectId.isValid(String(id))?(typeof id==='string'?new ObjectId(id):String(id)):null;
    const legacy=alternate?await db.collection('customers').findOne({_id:alternate,companyId},{projection:{customerName:1}}):null;
    console.log(JSON.stringify({title:record.title,customerId:id || null,customerName:customer?.customerName || legacy?.customerName || '',status:!id?'NO_CUSTOMER_LINKED':legacy?'ID_TYPE_MISMATCH':!customer?'CUSTOMER_NOT_FOUND':!customer.customerName?.trim()?'CUSTOMER_NAME_EMPTY':'OK'}));
  }
}catch(error){console.error(`Read-only diagnostic failed (${error.name}). Check database connectivity and configuration.`);process.exitCode=1;}
finally{await client.close();}
