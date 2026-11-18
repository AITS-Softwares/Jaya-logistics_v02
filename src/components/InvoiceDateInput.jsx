"use client";
import { useEffect, useRef, useState } from 'react';
import { displayInvoiceDate, invoiceDateIso } from '@/lib/invoice-date.mjs';

export default function InvoiceDateInput({ value = '', onChange, disabled, className }) {
  const [draft, setDraft] = useState(() => displayInvoiceDate(value));
  const lastEmitted = useRef(value);
  const calendar = useRef(null);
  const textInput = useRef(null);
  useEffect(() => {
    if (value !== lastEmitted.current) { setDraft(displayInvoiceDate(value)); lastEmitted.current = value; textInput.current?.setCustomValidity(''); }
  }, [value]);
  const emit = next => { lastEmitted.current = next; onChange(next); };
  return <div className="relative">
    <input ref={textInput} type="text" aria-label="BOE / Invoice Date" placeholder="DD/MM/YYYY" maxLength={10} disabled={disabled}
      value={draft} className={`${className} pr-12`} onChange={event => {
        const text = event.target.value;
        setDraft(text);
        emit(invoiceDateIso(text));
        event.target.setCustomValidity(text && !invoiceDateIso(text) ? 'Enter a valid date in DD/MM/YYYY format.' : '');
      }} onBlur={event => {
        const iso = invoiceDateIso(draft);
        if (iso) setDraft(displayInvoiceDate(iso));
        else if (draft) event.target.reportValidity();
      }} />
    <span className="absolute bottom-1 right-1 top-2 flex w-9 items-center justify-center text-slate-500">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4m8-4v4M4 10h16M4 5h16v16H4z" /></svg>
      <input ref={calendar} type="date" aria-label="Choose invoice date" value={value} disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onClick={() => calendar.current?.showPicker?.()}
        onChange={event => { const next = event.target.value; textInput.current?.setCustomValidity(''); setDraft(displayInvoiceDate(next)); emit(next); }} />
    </span>
  </div>;
}
