import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    await dbConnect();
    const company = await Company.findOne({ email });

    if (!company) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken(
      { ...company.toObject(), type: 'company', accessAllOperatingCompanies: true },
      { isGroupAdmin: true, groupName: 'JAYA GROUP' }
    );
    const safeCompany = company.toObject();
    delete safeCompany.password;
    safeCompany.type = 'company';
    safeCompany.accessAllOperatingCompanies = true;
    safeCompany.isGroupAdmin = true;
    safeCompany.groupName = 'JAYA GROUP';
    const response = NextResponse.json({ token, company: safeCompany }, { status: 200 });
    response.cookies.set({ name: 'token', value: '', maxAge: 0, path: '/' });
    return response;

  } catch (err) {
    console.error('Company Login Error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
