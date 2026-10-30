import { NextResponse } from 'next/server';
import { customerApiBlocked } from './lib/customerApiBoundary.mjs';

export function middleware(req) {
  if (customerApiBlocked(req.nextUrl.pathname, req.headers.get('authorization'))) {
    return NextResponse.json({ success: false, message: 'Customer accounts can only access the customer portal.' }, {
      status: 403, headers: { 'Cache-Control': 'private, no-store' },
    });
  }
  return NextResponse.next();
}

export const config = { matcher: '/api/:path*' };
