import { NextResponse } from 'next/server';
import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { withAuth } from '@/lib/auth';
import { withBranchAccess } from '@/lib/branchAccess';
import connectDb from '@/lib/db';
import { companyScopeFilter } from '@/lib/companyScope';
import LoadingPanel from '@/app/api/loading-panel/LoadingPanel';

export const runtime = 'nodejs';
const fail = (message, status) => NextResponse.json({ success: false, message }, { status });

const handler = withAuth(async (req, context, user) => {
  let storedPath;
  try {
    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id || '')) return fail('Invalid Loading Info ID.', 400);
    await connectDb();
    const scope = companyScopeFilter(user, { _id: id });
    const record = await LoadingPanel.findOne(scope).select('panelStatus loadingWorkflow').lean();
    if (!record) return fail('Loading Info not found.', 404);
    const approved = ['Approved', 'Completed'].includes(record.panelStatus) &&
      (record.loadingWorkflow?.version !== 2 || record.loadingWorkflow.part2Status === 'Approved');
    if (!approved) return fail('Use the regular upload before full approval.', 409);
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > 10 * 1024 * 1024) return fail('Choose a PDF, JPG, PNG or WebP file up to 10 MB.', 400);
    const extensions = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const extension = extensions[file.type];
    if (!extension) return fail('Only PDF, JPG, PNG and WebP slips are supported.', 400);
    const at = new Date();
    const relative = `uploads/loaded-slips/${String(record._id)}/${at.getTime()}-${randomUUID()}${extension}`;
    storedPath = path.join(process.cwd(), 'public', relative);
    await mkdir(path.dirname(storedPath), { recursive: true });
    await writeFile(storedPath, Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
    // Atomic append; approval and financial fields are deliberately untouched.
    const result = await LoadingPanel.updateOne({ ...scope, panelStatus: record.panelStatus, ...(record.loadingWorkflow?.version === 2 ? { "loadingWorkflow.version": 2, "loadingWorkflow.part2Status": "Approved" } : {}) }, {
      $push: {
        loadedVehicleSlips: `/${relative}`,
        loadedSlipUploads: { filePath: `/${relative}`, originalName: file.name, uploadedAt: at, uploadedBy: user._id || user.id, uploadedByName: user.name || user.email || '' },
      },
    });
    if (!result.matchedCount) { await unlink(storedPath); storedPath = null; return fail('Loading Info changed. Refresh and try again.', 409); }
    return NextResponse.json({ success: true, message: 'Loaded slip added. Approval is unchanged.' });
  } catch (error) {
    if (storedPath) await unlink(storedPath).catch(() => {});
    console.error('Loaded slip upload failed:', error);
    return fail('Unable to upload the loaded slip.', 500);
  }
}, { module: 'Loading Info', action: 'edit' });

export const POST = withBranchAccess(handler);
