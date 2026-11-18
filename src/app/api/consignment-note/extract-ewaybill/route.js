import { withBranchAccess } from '@/lib/branchAccess';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { readInvoiceFile } from '../invoiceFile';
import { extractInvoice } from '@/lib/invoice-extraction.mjs';

export const runtime = 'nodejs';
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg' };
const handler = withAuth(async req => {
  try {
    const { filePath } = await req.json();
    const match = typeof filePath === 'string' && filePath.match(/^uploads\/lr-invoice\/([0-9a-f-]{36}\.(pdf|png|jpg))$/);
    if (!match) return NextResponse.json({ success: false, message: 'Invalid invoice file.' }, { status: 400 });
    const buffer = await readInvoiceFile(match[1]);
    if (buffer.length > 5 * 1024 * 1024) return NextResponse.json({ success: false, message: 'Invoice exceeds 5 MB.' }, { status: 400 });
    const extraction = await extractInvoice(buffer, MIME[match[2]]);
    return NextResponse.json({ success: true, ocr: extraction.status, ...extraction,
      extraction: { ...extraction, sourceFilePath: filePath, extractedAt: new Date().toISOString(), version: 3 } });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not extract this invoice. It may be encrypted, damaged or unsupported. You can still enter details manually.' }, { status: 422 });
  }
}, { module: 'Consignment Note', actions: ['create', 'edit'] });
export const POST = withBranchAccess(handler);
