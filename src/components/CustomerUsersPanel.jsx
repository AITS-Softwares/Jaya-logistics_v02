"use client";

import { useEffect, useState } from 'react';
import Select from 'react-select';

const emptyForm = () => ({ name: '', email: '', customerId: '', password: '', allowedOperatingCompanyIds: [], isActive: true });
async function request(path, options = {}) {
  const res = await fetch(path, { ...options, cache: 'no-store', headers: {
    'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Unable to load customer users.');
  return data;
}

export default function CustomerUsersPanel() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [chosenCustomer, setChosenCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [optionsError, setOptionsError] = useState('');

  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const data = await request(`/api/customer-users?page=${page}&q=${encodeURIComponent(search)}`);
        if (live) { setUsers(data.users); setPageCount(data.pageCount); }
      } catch (err) { if (live) { setError(err.message); setUsers([]); } }
      finally { if (live) setLoading(false); }
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [page, search, refresh]);

  useEffect(() => {
    if (!form) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const data = await request(`/api/customer-users/options?q=${encodeURIComponent(customerSearch)}`);
        if (live) { setCompanies(data.companies); setCustomers(data.customers); setOptionsError(''); }
      } catch (err) { if (live) setOptionsError(err.message); }
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [customerSearch, !!form]);

  function open(user) {
    setEditing(user || null); setMessage(''); setError(''); setOptionsError(''); setCustomerSearch('');
    setChosenCustomer(user?.customerId || null);
    setForm(user ? { name: user.name, email: user.email, customerId: user.customerId?._id || '', password: '', allowedOperatingCompanyIds: user.allowedOperatingCompanyIds.map(String), isActive: user.isActive } : emptyForm());
  }
  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try {
      const data = await request('/api/customer-users', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ ...form, id: editing?._id }) });
      setMessage(data.message); setForm(null); setRefresh(value => value + 1);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900';


  return <section className="mx-auto max-w-6xl p-4 md:p-8 text-slate-900">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold">Customer Users</h1><p className="mt-1 text-sm text-slate-600">Create a separate login email for a customer and assign the companies they can view.</p></div>
      <button onClick={() => open()} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Create customer login</button>
    </div>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {message && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}
    <label className="block max-w-md text-sm font-medium">Search customer users<input className={input} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Name or login email" /></label>
    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr>{['Name', 'Login email', 'Customer', 'Access', ''].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={5} className="p-6">Loading customer users…</td></tr> : users.length ? users.map(user => <tr key={user._id} className="border-t border-slate-100">
          <td className="p-4 font-semibold">{user.name}</td><td className="p-4">{user.email}</td><td className="p-4">{user.customerId?.customerName || 'Customer unavailable'}</td>
          <td className="p-4">{user.isActive ? 'Active' : 'Disabled'}</td>
          <td className="p-4"><button className="font-semibold text-indigo-700" onClick={() => open(user)}>Manage</button></td>
        </tr>) : <tr><td colSpan={5} className="p-6 text-slate-500">No customer users found.</td></tr>}</tbody>
      </table>
    </div>
    <div className="mt-4 flex items-center justify-end gap-4 text-sm"><button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {pageCount}</span><button disabled={page >= pageCount || loading} onClick={() => setPage(value => value + 1)} className="disabled:opacity-40">Next</button></div>
    {form && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="customer-user-title">
      <form onSubmit={save} className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between"><h2 id="customer-user-title" className="text-xl font-bold">{editing ? 'Manage customer login' : 'Create customer login'}</h2><button type="button" disabled={saving} onClick={() => setForm(null)} aria-label="Close" className="p-2">✕</button></div>
        <p className="mt-2 text-sm text-slate-500">The login email is independent of the Customer Master email. Password resets are managed here by your administrator.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {optionsError && <p role="alert" className="mt-3 text-sm text-red-700">{optionsError}</p>}
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Customer name<input required maxLength={120} className={input} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} autoComplete="off" /></label>
          <label className="block text-sm font-medium">Login email<input required type="email" maxLength={254} className={input} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} autoComplete="off" /></label>
          <div>
            <label htmlFor="portal-customer-select" className="block text-sm font-medium">Customer</label>
            <Select
              inputId="portal-customer-select"
              name="customerId"
              required
              isClearable
              className="mt-1 text-sm"
              placeholder="Search and select a customer"
              value={chosenCustomer ? { value: chosenCustomer._id, label: chosenCustomer.customerName } : null}
              options={customers.map(customer => ({ value: customer._id, label: customer.customerName + (customer.customerCode ? ` (${customer.customerCode})` : ''), customer }))}
              filterOption={null}
              onInputChange={(value, action) => { if (action.action === 'input-change') setCustomerSearch(value); }}
              onChange={option => {
                const customer = option?.customer || null;
                setForm({ ...form, customerId: customer?._id || '', name: !form.name.trim() || form.name === chosenCustomer?.customerName ? customer?.customerName || '' : form.name });
                setChosenCustomer(customer);
                setCustomerSearch('');
              }}
              noOptionsMessage={() => 'No customers found. Try another name.'}
            />
          </div>
          <label className="block text-sm font-medium">{editing ? 'New password (leave blank to keep current)' : 'Password'}<input type="password" required={!editing} minLength={8} maxLength={72} className={input} autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /><span className="mt-1 block text-xs text-slate-500">At least 8 characters. Share this password with the customer; they can sign in directly.</span></label>
          <fieldset><legend className="text-sm font-semibold">Allowed operating companies</legend><div className="mt-2 flex flex-wrap gap-4">{companies.map(company => <label key={company._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowedOperatingCompanyIds.includes(String(company._id))} onChange={event => setForm({ ...form, allowedOperatingCompanyIds: event.target.checked ? [...form.allowedOperatingCompanyIds, String(company._id)] : form.allowedOperatingCompanyIds.filter(id => id !== String(company._id)) })} />{company.name}</label>)}</div>{!companies.length && <p className="text-sm text-slate-500">No assignable companies loaded.</p>}</fieldset>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={event => setForm({ ...form, isActive: event.target.checked })} />Account active</label>
        </div>
        <p className="mt-4 text-xs text-slate-500">Saving changes revokes previous sessions. Disabling the account blocks portal access.</p>
        <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={saving || !!optionsError} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save customer login'}</button></div>
      </form>
    </div>}
  </section>;
}
