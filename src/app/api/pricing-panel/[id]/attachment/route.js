import { NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
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
    if (!panel || !relativePath.startsWith('/uploads/pricing-approval/')) {
      return NextResponse.json({ success: false, message: 'Attachment not found.' }, { status: 404 });
    }

    const filename = path.basename(relativePath);
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'pricing-approval', filename);
    const file = await readFile(filePath);
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
