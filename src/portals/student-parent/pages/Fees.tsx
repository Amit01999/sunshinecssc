import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentScope } from "../useStudentScope";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  dueDate: string;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
}

interface InvoiceItem {
  categoryId?: { _id: string; name: string };
  amount: number;
  discount: number;
}

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  dueDate: string;
  status: Invoice["status"];
  items: InvoiceItem[];
}

interface Payment {
  _id: string;
  amount: number;
  method: string;
  receiptNumber: string;
  paidAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  unpaid: "bg-amber-50 text-amber-700 border-amber-200",
  partially_paid: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
};

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function InvoiceDetailDialog({ invoiceId, onClose }: { invoiceId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => (await api.get(`/fees/invoices/${invoiceId}`)).data.data as { invoice: InvoiceDetail; payments: Payment[] },
  });

  return (
    <Dialog open={Boolean(invoiceId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invoice {data?.invoice?.invoiceNumber ?? ""}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Breakdown</p>
              <div className="space-y-1.5">
                {data.invoice.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.categoryId?.name ?? "Fee item"}</span>
                    <span className="text-gray-600">
                      {formatMoney(item.amount)}
                      {item.discount > 0 && <span className="text-emerald-600"> (−{formatMoney(item.discount)})</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold border-t mt-2 pt-2">
                <span>Total</span>
                <span>{formatMoney(data.invoice.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Paid</span>
                <span>{formatMoney(data.invoice.amountPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-gray-800">
                <span>Balance</span>
                <span>{formatMoney(data.invoice.totalAmount - data.invoice.amountPaid)}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Payment History</p>
              {data.payments.length ? (
                <div className="space-y-1.5">
                  {data.payments.map((p) => (
                    <div key={p._id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 capitalize">
                        {p.method.replace("_", " ")} <span className="text-gray-400">· {p.receiptNumber}</span>
                      </span>
                      <span className="text-gray-600">
                        {formatMoney(p.amount)} · {formatDate(p.paidAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No payments recorded yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function Fees() {
  const { studentId, ready } = useStudentScope();
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);

  const { data: invoices, isLoading, isError } = useQuery({
    queryKey: ["my-invoices", studentId],
    enabled: ready,
    queryFn: async () => {
      const params = studentId ? { studentId } : {};
      const res = await api.get<{ data: Invoice[] }>("/fees/invoices", { params });
      return res.data.data;
    },
  });

  if (!ready) return <EmptyState icon={Wallet} title="Select a child above to view fees" />;

  return (
    <div>
      <PageHeader title="Fees & Payments" description="Invoices and payment status recorded by the school office." />

      {isError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load fee information right now. Please try again later.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="divide-y">
              {invoices.map((inv) => (
                <div key={inv._id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-800">{formatMoney(inv.totalAmount)}</p>
                      <p className="text-xs text-gray-400">Paid {formatMoney(inv.amountPaid)}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_STYLES[inv.status] ?? ""}`}>
                      {inv.status.replace("_", " ")}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => setOpenInvoiceId(inv._id)}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Fee invoices issued by the school office will appear here."
            />
          )}
        </CardContent>
      </Card>

      <InvoiceDetailDialog invoiceId={openInvoiceId} onClose={() => setOpenInvoiceId(null)} />
    </div>
  );
}
