"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * "12 Purchases yet to be created" chip for list pages.
 * The number comes from a count endpoint that uses the SAME rule as the create-page dropdown.
 * Hidden while loading and on error; shows a caught-up state when nothing is pending.
 *
 * Props: endpoint, singular, plural, href (optional: makes the chip a link), hint (tooltip)
 */
export default function PendingToCreateChip({ canCreate = false, endpoint, singular, plural, href, hint }) {
    const [count, setCount] = useState(null);

    useEffect(() => {
        if (!canCreate) return;
        let live = true;
        const refreshCount = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
                const json = await res.json();
                if (live && res.ok && json.success) setCount(Math.max(0, Number(json.data?.count) || 0));
            } catch {
                /* the chip simply stays hidden */
            }
        };
        const handleRefresh = () => refreshCount();
        refreshCount();
        window.addEventListener("pending-to-create-refresh", handleRefresh);
        return () => {
            live = false;
            window.removeEventListener("pending-to-create-refresh", handleRefresh);
        };
    }, [canCreate, endpoint]);

    if (!canCreate) return null;
    if (count === null) return null;

    const pending = count > 0;
    const cls = pending
        ? "inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
        : "inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800";
    const body = (
        <>
            <span className={`h-2 w-2 rounded-full ${pending ? "bg-amber-500" : "bg-emerald-500"}`} />
            {pending ? `${count} ${count === 1 ? singular : plural} yet to be created` : "Nothing pending to create"}
        </>
    );

    return pending && href
        ? <Link href={href} title={hint} className={`${cls} hover:bg-amber-100`}>{body}</Link>
        : <span title={hint} className={cls}>{body}</span>;
}
