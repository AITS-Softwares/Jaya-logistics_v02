"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { invalidSessionStatus, sessionDestination } from '@/lib/sessionRestore.mjs';
import { FiEye, FiEyeOff, FiMail, FiLock, FiChevronRight, FiLoader, FiShield, FiUser, FiBriefcase, FiGlobe, FiBox, FiSettings, FiLayers } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './signin.css';
const Link = ({ href, children, className }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState('Company'); // Company | User | Customer
  const [step, setStep] = useState('login'); // login | email | setPassword
  const [form, setForm] = useState({ email: '', password: '', operatingCompanyCode: '' });
  const [operatingCompanies, setOperatingCompanies] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [restoreError, setRestoreError] = useState('');

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  useEffect(() => {
    axios.get('/api/auth/operating-companies')
      .then((response) => setOperatingCompanies(response.data?.data || []))
      .catch(() => setOperatingCompanies([]));
  }, []);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    async function restore() {
      try {
        const token = localStorage.getItem('token');
        if (!token) { if (live) setChecking(false); return; }
        const response = await fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${token}` } });
        if (!live) return;
        if (invalidSessionStatus(response.status)) {
          ['token', 'user', 'groupToken', 'lastPath', 'lastPathOwner'].forEach(key => localStorage.removeItem(key));
          setChecking(false); return;
        }
        if (!response.ok) throw new Error('Unable to check your session. Check your connection and retry.');
        const data = await response.json();
        if (!data.user) throw new Error('Session response was incomplete. Please retry.');
        localStorage.setItem('user', JSON.stringify(data.user));
        router.replace(sessionDestination(data.user, localStorage));
      } catch (error) {
        if (live) { setRestoreError(error.name === 'AbortError' ? 'The session check timed out. Please check your connection and retry.' : error.message || 'Unable to check your session.'); setChecking(false); }
      } finally {
        clearTimeout(timeout);
      }
    }
    restore();
    return () => { live = false; clearTimeout(timeout); controller.abort(); };
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error("Credentials required");
    if (mode === 'User' && !form.operatingCompanyCode) {
      return toast.error("Select a company before signing in");
    }

    setLoading(true);
    try {
      const urls = {
        Company: "/api/company/login",
        User: "/api/users/login",
        Customer: "/api/portal/login",
      };

      const payload = mode === 'Customer'
        ? { email: form.email, password: form.password }
        : form;
      const res = await axios.post(urls[mode], payload);
      const { token, company, user, customer } = res.data;
      const finalUser = company || user || customer;

      if (!token || !finalUser) throw new Error("Authentication failed");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(finalUser));
      if (mode === "Company") localStorage.setItem("groupToken", token);
      else localStorage.removeItem("groupToken");

      // Verify the newly-created session before announcing success. This makes
      // a header/session failure visible on the login screen instead of leaving
      // the user on a non-working dashboard after a misleading success toast.
      const sessionCheck = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sessionCheck.ok) {
        const sessionData = await sessionCheck.json().catch(() => ({}));
        if (invalidSessionStatus(sessionCheck.status)) { localStorage.removeItem('token'); localStorage.removeItem('user'); }
        throw new Error(sessionData.message || sessionData.msg || 'Unable to start your session. Please try again.');
      }

      toast.success(`Access Granted: ${finalUser.name || "User"}`);

      const roleRedirectMap = {
        admin: "/admin",
        agent: "/admin",
        employee: "/admin",
        customer: "/customer-dashboard",
      };

      let redirect = mode === "Company" ? "/admin/group-overview" : "/admin";
      if (mode === "Customer") {
        redirect = "/customer-dashboard";
      } else if (mode === "User") {
        const roles = finalUser?.roles?.map((r) => r.toLowerCase()) || [];
        const matchedRole = roles.find((r) => roleRedirectMap[r]);
        redirect = roleRedirectMap[matchedRole] || "/admin";
      }

      setTimeout(() => router.push(redirect), 500);
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Verification Failed");
    } finally {
      setLoading(false);
    }
  };

  if (checking || restoreError) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="text-center"><img src="/jaya-global-icon.png" alt="Jaya Group logo" width={64} height={64} className="mx-auto mb-4 object-contain" /><h1 className="mb-5 text-xl font-bold tracking-wide text-slate-900">JAYA GROUP</h1>{checking ? <><FiLoader className="mx-auto animate-spin text-blue-600" size={28} /><p className="mt-3 text-sm text-slate-600">Checking your session...</p></> : <><p role="alert" className="text-sm text-slate-700">{restoreError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Retry session check</button></>}</div></main>;

  return (
    <main className="signin-landing">
      <img className="signin-hero-image" src="/images/jaya-group-hero-original.png" alt="Jaya Group global logistics: ships, trucks and air freight" fetchPriority="high" />
      <ToastContainer position="top-center" theme="light" />
      <div className="signin-layout">
        <section className="signin-intro" aria-labelledby="signin-headline">
          <div className="signin-brand">
            <span className="signin-monogram" aria-hidden="true">JG</span>
            <span className="signin-brand-name">JAYA GROUP</span>
          </div>
          <div className="signin-message">
            <p className="signin-eyebrow">Connected logistics. Endless possibilities.</p>
            <h1 id="signin-headline">Built for speed.<br />Designed for scale.<br /><span>Trusted forever.</span></h1>
            <ul className="signin-benefits">
              <li><FiLayers aria-hidden="true" /><span>5PL<br /><strong>Solutions</strong></span></li>
              <li><FiBox aria-hidden="true" /><span>End-to-end visibility<br /><strong>across operations</strong></span></li>
              <li><FiSettings aria-hidden="true" /><span>Intelligent<br /><strong>operations</strong></span></li>
              <li><FiGlobe aria-hidden="true" /><span>Global<br /><strong>network</strong></span></li>
            </ul>
          </div>
        </section>
        <section className="signin-panel" aria-labelledby="signin-title">
          <div className="signin-card">
            <div className="signin-card-heading">
              <span className="signin-welcome">YOUR WORKSPACE, CONNECTED</span>
              <h2 id="signin-title">Welcome back</h2>
              <p>Please sign in to your account</p>
            </div>
            <div className="signin-tabs">
              {/* TAB SELECTOR */}
              <div className="flex p-2 bg-black/20 gap-1">
                {[
                  { id: 'Customer', icon: <FiMail /> },
                  { id: 'User', icon: <FiUser /> },
                  { id: 'Company', icon: <FiBriefcase /> }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMode(m.id);
                      setForm({ email: '', password: '', operatingCompanyCode: '' });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${mode === m.id
                      ? 'bg-[#b3842e] text-white shadow-lg'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                  >
                    {m.icon} {m.id}
                  </button>
                ))}
              </div>


            </div>
            <div className="signin-form-body">
              <form onSubmit={submit} className="space-y-6">

                {/* EMAIL FIELD */}
                <div className="group">
                  <label htmlFor="signin-email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-[#8a621c]">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-[#a47622] transition-colors">
                      <FiMail size={18} />
                    </div>
                    <input
                      type="email"
                      id="signin-email"
                      autoComplete="username"
                      name="email"
                      value={form.email}
                      onChange={handle}
                      className="w-full bg-black/40 border-2 border-transparent focus:border-[#a47622]/50 text-white pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 placeholder:text-slate-700 font-bold text-sm shadow-inner"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                {mode === 'User' && (
                  <div className="group">
                    <label htmlFor="signin-company" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-[#8a621c]">Operating Company</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-[#a47622] transition-colors">
                        <FiBriefcase size={18} />
                      </div>
                      <select
                        id="signin-company"
                        name="operatingCompanyCode"
                        value={form.operatingCompanyCode}
                        onChange={handle}
                        required
                        className="w-full appearance-none bg-black/40 border-2 border-transparent focus:border-[#a47622]/50 text-white pl-14 pr-5 py-4 rounded-2xl outline-none transition-all duration-300 font-bold text-sm shadow-inner"
                      >
                        <option value="" className="bg-[#fff8e9]">Select company</option>
                        {operatingCompanies.map((company) => (
                          <option key={company.code} value={company.code} className="bg-[#fff8e9]">
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* PASSWORD FIELD */}
                <div className="group">
                  <label htmlFor="signin-password" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 transition-colors group-focus-within:text-[#8a621c]">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-[#a47622] transition-colors">
                      <FiLock size={18} />
                    </div>
                    <input
                      type={show ? "text" : "password"}
                      id="signin-password"
                      autoComplete="current-password"
                      name="password"
                      value={form.password}
                      onChange={handle}
                      className="w-full bg-black/40 border-2 border-transparent focus:border-[#a47622]/50 text-white pl-14 pr-14 py-4 rounded-2xl outline-none transition-all duration-300 placeholder:text-slate-700 font-bold text-sm shadow-inner"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Hide password" : "Show password"}
                      aria-pressed={show}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-[#8a621c] transition-colors"
                    >
                      {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </div>
                </div>

                {/* FORGOT PASS */}
                <div className="flex justify-end px-1">
                  <button type="button" className="text-[10px] font-black text-[#a47622] uppercase tracking-widest hover:text-[#8a621c] transition-colors">Forgot password?</button>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-[#b3842e] hover:bg-[#a47622] text-white font-black py-5 rounded-2xl overflow-hidden transition-all duration-300 active:scale-95 shadow-2xl shadow-[#a47622]/20"
                >
                  <div className="relative z-10 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]">
                    {loading ? <FiLoader className="animate-spin" /> : "Sign in"}
                    {!loading && <FiChevronRight className="group-hover:translate-x-1 transition-transform" />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </button>
              </form>


            </div>
            <div className="signin-card-footer"><FiShield aria-hidden="true" /><span>Jaya Group · Enterprise Resource Hub</span></div>
          </div>
          <p className="signin-access-note">Authorized access only</p>
        </section>
      </div>
      <footer className="signin-footer"><span>Moving business forward. Together.</span><span>© {new Date().getFullYear()} Jaya Group</span></footer>
    </main>
  );
}

// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function LoginPage() {
//   const router = useRouter();

//   const [mode, setMode] = useState('Company');
//   const [form, setForm] = useState({ email: '', password: '' });
//   const [show, setShow] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

//   const submit = async (e) => {
//     e.preventDefault();
//     setLoading(true);

//     if (!form.email || !form.password) {
//       toast.error("Email and password are required");
//       setLoading(false);
//       return;
//     }

//     try {
//       const url =
//         mode === "Company"
//           ? "/api/company/login"
//           : "/api/users/login";

//       const res = await axios.post(url, form);

//       const token = res?.data?.token;
//       const company = res?.data?.company; // ✅ THIS IS CORRECT
//       const user = res?.data?.user; // for user login case

//       const finalUser = mode === "Company" ? company : user;

//       if (!finalUser) {
//         toast.error("Invalid login response");
//         setLoading(false);
//         return;
//       }

//       // Save into localStorage
//       localStorage.setItem("token", token);
//       localStorage.setItem("user", JSON.stringify(finalUser));

//       toast.success("Login successful 🚀");

//       // ✅ Redirect logic
//       let redirect = "/";

//       if (mode === "Company") {
//         redirect = "/admin";
//       } else {
//         const roles = Array.isArray(finalUser?.roles)
//           ? finalUser.roles.map(r => r.toLowerCase())
//           : [];

//         if (roles.includes("admin")) redirect = "/admin";
//         else if (roles.includes("agent")) redirect = "/agent-dashboard";
//         else if (roles.includes("employee")) redirect = "/employee-dashboard";
//         else redirect = "/customer-dashboard";
//       }

//       setTimeout(() => {
//         router.push(redirect);
//       }, 800);

//     } catch (error) {
//       toast.error(
//         error?.response?.data?.message ||
//         "Invalid email or password"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800">
//       <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8 space-y-6">

//         {/* Mode Switch */}
//         <div className="flex justify-center gap-4">
//           {['Company','User'].map(m => (
//             <button
//               key={m}
//               onClick={() => {
//                 setMode(m);
//                 setForm({ email: '', password: '' });
//               }}
//               className={`px-4 py-2 rounded-lg ${
//                 mode === m
//                   ? 'bg-amber-400 text-white'
//                   : 'bg-gray-200 text-gray-700'
//               }`}
//             >
//               {m} Login
//             </button>
//           ))}
//         </div>

//         <h2 className="text-2xl font-bold text-center">
//           {mode} Login
//         </h2>

//         <form onSubmit={submit} className="space-y-4">

//           {/* Email */}
//           <div>
//             <label className="block text-sm">Email</label>
//             <div className="relative">
//               <FiMail className="absolute left-3 top-3 text-gray-500"/>
//               <input
//                 type="email"
//                 name="email"
//                 value={form.email}
//                 onChange={handle}
//                 className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
//                 placeholder="Enter your email"
//               />
//             </div>
//           </div>

//           {/* Password */}
//           <div>
//             <label className="block text-sm">Password</label>
//             <div className="relative">
//               <FiLock className="absolute left-3 top-3 text-gray-500"/>
//               <input
//                 type={show ? "text" : "password"}
//                 name="password"
//                 value={form.password}
//                 onChange={handle}
//                 className="w-full pl-10 py-2 border rounded-md focus:ring-2 focus:ring-amber-400"
//                 placeholder="Enter your password"
//               />

//               <button
//                 type="button"
//                 onClick={() => setShow(!show)}
//                 className="absolute right-3 top-3 text-gray-600"
//               >
//                 {show ? <FiEyeOff /> : <FiEye />}
//               </button>
//             </div>
//           </div>

//           <button
//             disabled={loading}
//             className={`w-full py-2 rounded-md text-white ${
//               loading
//                 ? 'bg-gray-400'
//                 : 'bg-amber-400 hover:bg-amber-600'
//             }`}
//           >
//             {loading ? 'Signing in…' : 'Sign In'}
//           </button>

//         </form>
//       </div>
//     </main>
//   );
// }
