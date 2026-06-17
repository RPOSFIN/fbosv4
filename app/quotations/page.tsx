"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { hasPermission } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { FbosRole } from "@/lib/rbac/permissions";

type Quotation = {
  id: string;
  quotation_no?: string;
  client_name?: string;
  amount?: number;
  status?: string;
};

export default function QuotationsPage() {
  const { session } = useAuth();
  const role = session?.profile.role as FbosRole | undefined;
  const canCreate = role ? hasPermission(role, "quotations", "create") : false;

  const [quotationNo, setQuotationNo] = useState("");
  const [clientName, setClientName] = useState("");
  const [amount, setAmount] = useState("");
  const [quotations, setQuotations] = useState<Quotation[]>([]);

  async function loadQuotations() {
    const data = await apiFetch<Quotation[]>("/api/quotations");
    setQuotations(data);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiFetch<Quotation[]>("/api/quotations");
        if (active) setQuotations(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function saveQuotation() {
    await apiFetch("/api/quotations", {
      method: "POST",
      body: JSON.stringify({
        quotation_no: quotationNo,
        client_name: clientName,
        amount: amount,
      }),
    });

    setQuotationNo("");
    setClientName("");
    setAmount("");
    await loadQuotations();
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Quotation Center</h1>

      {canCreate && (
        <div className="border border-cyan-500 rounded-xl p-5 max-w-xl mb-8">
          <input
            placeholder="Quotation No (optional)"
            value={quotationNo}
            onChange={(e) => setQuotationNo(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <input
            placeholder="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mb-3 p-3 bg-slate-900 border"
          />
          <button
            onClick={saveQuotation}
            className="bg-cyan-600 px-5 py-2 rounded"
          >
            Save Quotation
          </button>
        </div>
      )}

      <div className="border border-cyan-500 rounded-xl p-5">
        <table className="w-full border">
          <thead>
            <tr>
              <th className="border p-2">Quotation No</th>
              <th className="border p-2">Client</th>
              <th className="border p-2">Amount</th>
              <th className="border p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((row) => (
              <tr key={row.id}>
                <td className="border p-2">{row.quotation_no}</td>
                <td className="border p-2">{row.client_name}</td>
                <td className="border p-2">{row.amount}</td>
                <td className="border p-2">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
