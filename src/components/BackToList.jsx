import Link from "next/link";

export default function BackToList({ href }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 print:hidden"
    >
      <span aria-hidden="true">←</span>
      Back to list
    </Link>
  );
}
