"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { REPORT_REASONS } from "@/lib/utils";

type Props = {
  targetType: "experience" | "confirmation";
  targetId: string;
};

export function ReportButton({ targetType, targetId }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (status !== "authenticated") {
      router.push("/entrar");
      return;
    }
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    const data = await res.json();
    setMsg(data.message || data.error);
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-medium text-slate-400 underline hover:text-rose-600"
      >
        Denunciar
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border px-2 py-1.5 text-xs"
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void submit()}
            className="w-full rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white"
          >
            Enviar denúncia
          </button>
        </div>
      )}
      {msg && <p className="mt-1 text-[11px] text-slate-500">{msg}</p>}
    </div>
  );
}
