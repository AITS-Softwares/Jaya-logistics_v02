// Run from the project folder. Dry-run by default; --apply writes changes.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {loadEnvConfig}=require('@next/env');
loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production',{info(){},error(){}});
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--apply' && !arg.startsWith('--db='))) {
  console.error('Usage: node scripts/approve-existing-rate-masters.mjs [--db=DATABASE] [--apply]');
  process.exitCode=1;
} else {
  const uri=process.env.MASTER_APPROVAL_MONGO_URI || process.env.MONGODB_URI;
  const explicit=args.find(arg=>arg.startsWith('--db='))?.slice(5);
  const match=uri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/);
  let database=explicit;
  try {database ||= match?.[1]?decodeURIComponent(match[1]):undefined;}catch{}
  if(!uri || !database) {
    console.error('Configure MONGODB_URI in the project environment. If the URI has no database name, pass --db=YOUR_DATABASE.');
    process.exitCode=1;
  } else {
    process.env.MASTER_APPROVAL_MONGO_URI=uri;
    process.argv=[process.argv[0],process.argv[1],`--db=${database}`,'--only=ratemasters',...(args.includes('--apply')?['--apply']:[])];
    try {await import('./migrate-master-approval.mjs');}
    catch(error) {console.error(`Rate Master approval failed (${error.name}). Check database access and rerun the preview before retrying.`);process.exitCode=1;}
  }
}
