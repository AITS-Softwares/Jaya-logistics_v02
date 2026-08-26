import { NextResponse } from 'next/server';
import path from 'path';
import { readFile, unlink } from 'fs/promises';
import connectDb from '@/lib/db';
import PricingPanel from '@/app/api/pricing-panel/PricingPanel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { activeOperatingCompanyId, companyScopeFilter } from '@/lib/companyScope';

export const runtime = 'nodejs';

const PART2_APPROVAL_MODULE = 'Pricing Panel - Part 2 Approval';

function canViewAttachment(user) {
  if (user?.type === 'company' || user?.roles?.includes('Admin')) return true;
  const pricing = user?.modules?.['Pricing Panel'];
  const part2 = user?.modules?.[PART2_APPROVAL_MODULE];
  return (
    (!!pricing?.selected && pricing.permissions?.view !== false) ||
    (!!part2?.selected && (part2.permissions?.view !== false || part2.permissions?.approve === true))
  );
}

function canEditAttachment(user) {
  if (user?.type === 'company' || user?.roles?.includes('Admin')) return true;
  const pricing = user?.modules?.['Pricing Panel'];
  return !!pricing?.selected && pricing.permissions?.edit === true;
}

function isPricingApprovalPath(relativePath) {
  return typeof relativePath === 'string' && relativePath.startsWith('/uploads/pricing-approval/');
}

function attachmentLocations(filename) {
  // The public location is the canonical location for new files. The legacy
  // location keeps documents uploaded by older server code available too.
  return [
    path.join(process.cwd(), 'public', 'uploads', 'pricing-approval', filename),
    path.join(process.cwd(), 'uploads', 'pricing-approval', filename),
  ];
}

async function readAttachment(filename) {
  let missingError;
  for (const filePath of attachmentLocations(filename)) {
    try {
      return await readFile(filePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      missingError = error;
    }
  }
  throw missingError;
}

async function removeAttachment(filename) {
  for (const filePath of attachmentLocations(filename)) {
    try {
      await unlink(filePath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
}

function contentTypeFor(filename) {
  const extension = path.extname(filename).toLowerCase();
  return extension === '.pdf' ? 'application/pdf'
    : extension === '.png' ? 'image/png'
      : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg'
        : 'application/octet-stream';
}

/** Streams a saved Rate Approval document only after record-level permission checks. */
export async function GET(req, { params }) {
  const token = getTokenFromHeader(req);
  const user = token ? verifyJWT(token) : null;
  if (!user) return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  if (!canViewAttachment(user)) return NextResponse.json({ success: false, message: 'You do not have permission to view this attachment.' }, { status: 403 });

  try {
    activeOperatingCompanyId(user);
    await connectDb();
    const panel = await PricingPanel.findOne(companyScopeFilter(user, { _id: params.id }))
      .select('rateApproval.uploadFile rateApproval.uploadFilePath')
      .lean();
    const relativePath = panel?.rateApproval?.uploadFilePath || '';
    if (!panel || !isPricingApprovalPath(relativePath)) {
      return NextResponse.json({ success: false, message: 'Attachment not found.' }, { status: 404 });
    }

    const filename = path.basename(relativePath);
    const file = await readAttachment(filename);
    const displayName = panel.rateApproval.uploadFile || filename;
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentTypeFor(filename),
        'Content-Disposition': `inline; filename="${displayName.replace(/[\r\n"\\]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ success: false, message: 'Attachment file is no longer available.' }, { status: 404 });
    }
    console.error('GET /pricing-panel/[id]/attachment error:', error);
    return NextResponse.json({ success: false, message: 'Unable to open attachment.' }, { status: 500 });
  }
}

/** Removes a Part 1 attachment from both its record and the server disk. */
export async function DELETE(req, { params }) {
  const token = getTokenFromHeader(req);
  const user = token ? verifyJWT(token) : null;
  if (!user) return NextResponse.json({ success: false, message: 'Authentication required.' }, { status: 401 });
  if (!canEditAttachment(user)) return NextResponse.json({ success: false, message: 'Pricing Panel edit permission is required.' }, { status: 403 });

  try {
    activeOperatingCompanyId(user);
    await connectDb();
    const panel = await PricingPanel.findOne(companyScopeFilter(user, { _id: params.id }));
    if (!panel) return NextResponse.json({ success: false, message: 'Pricing panel not found.' }, { status: 404 });

    const relativePath = panel.rateApproval?.uploadFilePath || '';

    panel.rateApproval.uploadFile = '';
    panel.rateApproval.uploadFilePath = '';
    panel.rateApproval.uploadStoredName = '';
    panel.rateApproval.uploadFileSize = 0;
    panel.rateApproval.uploadMimeType = '';
    const nextRevision = Math.max(1, Number(panel.rateApproval.approvalRevision) || 1) + 1;
    panel.rateApproval.approvalRevision = nextRevision;
    panel.rateApproval.submittedRevision = 0;
    panel.rateApproval.approvalStatus = 'Pending';
    panel.rateApproval.workflowPhase = 'part1';
    panel.panelStatus = 'Draft';
    if (!panel.rateApproval.approvalHistory) panel.rateApproval.approvalHistory = [];
    panel.rateApproval.approvalHistory.push({
      revision: nextRevision,
      action: 'changed',
      userId: user.id || null,
      remarks: 'Rate approval attachment removed; approval is required for this revision.',
      createdAt: new Date(),
    });
    await panel.save();

    // The database no longer references the file before it is deleted. This
    // preserves the existing attachment if the database write itself fails.
    if (isPricingApprovalPath(relativePath)) {
      try {
        await removeAttachment(path.basename(relativePath));
      } catch (error) {
        // A failed disk cleanup must not undo a successful, auditable removal.
        // It only leaves an unreferenced file that can be cleaned up later.
        console.error('Unable to remove pricing approval file from disk:', error);
      }
    }

    return NextResponse.json({ success: true, message: 'Attachment removed successfully.' });
  } catch (error) {
    console.error('DELETE /pricing-panel/[id]/attachment error:', error);
    return NextResponse.json({ success: false, message: 'Unable to remove attachment.' }, { status: 500 });
  }
}
