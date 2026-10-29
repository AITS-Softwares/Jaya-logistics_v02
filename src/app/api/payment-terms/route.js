import { NextResponse } from 'next/server';
import connectDb from '@/lib/db';
import PaymentTerms from './schema';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { syncPaymentTerm } from '@/lib/frappe-payment-term.mjs';

async function validateUser(req) {
  const token = getTokenFromHeader(req);

  if (!token) {
    return { error: 'Token missing', status: 401 };
  }

  const user = await verifyJWT(token);

  if (!user) {
    return { error: 'Invalid token', status: 401 };
  }

  return { user };
}

export async function GET(req) {
  await connectDb();

  const { user, error, status } = await validateUser(req);

  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  const data = await PaymentTerms.find({
    companyId: user.companyId,
  }).sort({ name: 1 });

  return NextResponse.json({ success: true, data });
}

export async function POST(req) {
  await connectDb();

  const { user, error, status } = await validateUser(req);

  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  const { name, invoicePortion = 100, dueDateBasedOn = 'Day(s) after invoice date', creditDays = 0, creditMonths = 0 } = await req.json();

  if (Number(invoicePortion) !== 100) {
    return NextResponse.json({ success: false, message: 'A single payment term must cover 100% of the invoice. Instalment schedules will be added as a separate master.' }, { status: 400 });
  }

  const exists = await PaymentTerms.findOne({
    name,
    companyId: user.companyId,
  });

  if (exists) {
    return NextResponse.json({
      success: false,
      message: 'Payment Term already exists',
    });
  }

  const item = await PaymentTerms.create({
    name,
    companyId: user.companyId,
    createdBy: user.id,
    invoicePortion,
    dueDateBasedOn,
    creditDays,
    creditMonths,
  });

  const frappeSync = await syncPaymentTerm(item);
  item.frappeSync = { ...frappeSync, attemptedAt: new Date() };
  await item.save();

  return NextResponse.json({ success: true, data: item });
}

export async function PUT(req) {
  await connectDb();

  const { user, error, status } = await validateUser(req);

  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  const { id, name, invoicePortion = 100, dueDateBasedOn = 'Day(s) after invoice date', creditDays = 0, creditMonths = 0 } = await req.json();

  if (Number(invoicePortion) !== 100) {
    return NextResponse.json({ success: false, message: 'A single payment term must cover 100% of the invoice. Instalment schedules will be added as a separate master.' }, { status: 400 });
  }

  const updated = await PaymentTerms.findOneAndUpdate(
    {
      _id: id,
      companyId: user.companyId,
    },
    { name, invoicePortion, dueDateBasedOn, creditDays, creditMonths },
    { new: true }
  );

  if (!updated) {
    return NextResponse.json({ success: false, message: 'Payment Term not found' }, { status: 404 });
  }

  const frappeSync = await syncPaymentTerm(updated);
  updated.frappeSync = { ...frappeSync, attemptedAt: new Date() };
  await updated.save();

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req) {
  await connectDb();

  const { user, error, status } = await validateUser(req);

  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  await PaymentTerms.findOneAndDelete({
    _id: id,
    companyId: user.companyId,
  });

  return NextResponse.json({
    success: true,
    message: 'Deleted Successfully',
  });
}
