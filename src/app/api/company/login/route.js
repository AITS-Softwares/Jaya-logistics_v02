import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { ensureOperatingCompanies } from '@/lib/companyScope';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, operatingCompanyCode } = body;

    if (!email || !password || !operatingCompanyCode) {
      return NextResponse.json({ message: 'Email, password, and company selection are required' }, { status: 400 });
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

    const operatingCompanies = await ensureOperatingCompanies(company._id);
    const selectedOperatingCompany = operatingCompanies.find(
      (item) => item.code === String(operatingCompanyCode).trim().toUpperCase()
    );
    if (!selectedOperatingCompany) {
      return NextResponse.json({ message: 'Selected company is unavailable' }, { status: 400 });
    }

    const token = signToken(
      { ...company.toObject(), type: 'company', accessAllOperatingCompanies: true },
      { activeOperatingCompany: selectedOperatingCompany }
    );
    const safeCompany = company.toObject();
    delete safeCompany.password;
    safeCompany.type = 'company';
    safeCompany.accessAllOperatingCompanies = true;
    safeCompany.activeOperatingCompany = {
      _id: selectedOperatingCompany._id,
      name: selectedOperatingCompany.name,
      code: selectedOperatingCompany.code,
    };
    return NextResponse.json({ token, company: safeCompany }, { status: 200 });

  } catch (err) {
    console.error('Company Login Error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
