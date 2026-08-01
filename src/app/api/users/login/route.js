
// // /app/api/login/route.js
// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import CompanyUser from '@/models/CompanyUser';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import {jwtDecode} from 'jwt-decode';


// const SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();

//     if (!email || !password) {
//       return NextResponse.json(
//         { message: 'Email and password are required' },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     // 🔐 Find user
//     const user = await CompanyUser.findOne({ email });
//     if (!user) {
//       return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
//     }

//     // 🔐 Validate password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
//     }

//     // ✅ Convert modules Map to plain object
//     const modules = user.modules ? Object.fromEntries(user.modules) : {};

//     // ✅ Generate JWT
//     const token = jwt.sign(
//       {
//         id: user._id,
//         companyId: user.companyId,
//         email: user.email,
//         roles: Array.isArray(user.roles) ? user.roles : [],
//         modules,
//         type: 'user',
//       },
//       SECRET,
//       { expiresIn: '1d' }

//     );
//     // add console log to verify token payload
//      console.log(jwtDecode(token));
//       console.log(JSON.stringify(user.modules, null, 2));
      

//     // ✅ Remove sensitive fields
//     const { password: _, __v, ...safeUser } = user.toObject();
//     safeUser.modules = modules;

//     console.log(jwtDecode(token));
//     console.log(JSON.stringify(user.modules, null, 2));

//     return NextResponse.json({ token, user: safeUser });
//   } catch (e) {
//     console.error('Login error:', e);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }

// app/api/company/login/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user
    const user = await CompanyUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Convert modules Map to plain object
    const modulesObj = {};
    if (user.modules) {
      for (const [key, value] of user.modules) {
        modulesObj[key] = {
          selected: value.selected || false,
          permissions: value.permissions || {}
        };
      }
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        name: user.name,
        roles: user.roles || [],
        modules: modulesObj,
        type: user.type || 'user',
      },
      SECRET,
      { expiresIn: '7d' }
    );

    // Remove sensitive fields
    const userResponse = {
      _id: user._id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      roles: user.roles || [],
      modules: modulesObj,
      type: user.type || 'user',
      isActive: user.isActive,
      employeeId: user.employeeId,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };

    return NextResponse.json({
      success: true,
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Server error during login' },
      { status: 500 }
    );
  }
}