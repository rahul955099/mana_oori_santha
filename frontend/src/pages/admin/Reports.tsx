import { useCallback, useEffect, useState } from "react";
import { Download, IndianRupee, ShoppingBag, Receipt, Percent, Tag, UserPlus } from "lucide-react";
import { useCategories } from "@/context/CategoriesContext";
import { useToast } from "@/context/ToastContext";
import { StatCard } from "@/components/common/StatCard";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";
import { DailyRevenueChart } from "@/components/reports/DailyRevenueChart";
import { api, errorMessage } from "@/lib/api";
import { downloadOrdersCsv, isoDaysAgo, type SalesReport } from "@/lib/reports";
import { formatCurrency } from "@/utils/format";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/utils/orderStatus";

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const inputClass = "rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 outline-none focus:border-primary-400";

/** A labelled horizontal bar; the value is printed in text ink beside it. */
function BarRow({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-stone-600">{label}</span>
        <span className="font-bold text-stone-900">{display}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${(value / Math.max(max, 1)) * 100}%` }} />
      </div>
    </div>
  );
}

export default function AdminReports() {
  const { categories } = useCategories();
  const { showToast } = useToast();
  const [from, setFrom] = useState(isoDaysAgo(29));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReport(await api.get<SalesReport>("/admin/reports/summary", { from, to }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPreset(days: number) {
    setFrom(isoDaysAgo(days - 1));
    setTo(isoDaysAgo(0));
  }

  async function handleExport() {
    setExporting(true);
    try {
      await downloadOrdersCsv(from, to);
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setExporting(false);
    }
  }

  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const t = report?.totals;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">Reports</h1>
          <p className="mt-1 text-sm text-stone-500">
            Sales exclude cancelled and returned orders. Dates are in Indian Standard Time.
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting} className={buttonClasses("primary", "md")}>
          <Download size={16} /> {exporting ? "Exporting..." : "Export Orders (CSV)"}
        </button>
      </div>

      {/* All filters in one row above the charts. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const selected = from === isoDaysAgo(p.days - 1) && to === isoDaysAgo(0);
          return (
            <button
              key={p.days}
              onClick={() => applyPreset(p.days)}
              className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                selected ? "border-primary-500 bg-primary-50 text-primary-800" : "border-stone-200 bg-white text-stone-500 hover:border-primary-300"
              }`}
            >
              Last {p.label}
            </button>
          );
        })}
        <span className="ml-2 text-xs text-stone-400">or</span>
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={inputClass} aria-label="From date" />
        <span className="text-xs text-stone-400">to</span>
        <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className={inputClass} aria-label="To date" />
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!report && !error && <Loading label="Building report..." />}

      {report && t && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={IndianRupee} label="Revenue (incl. delivery)" value={formatCurrency(t.revenue)} tone="primary" />
            <StatCard icon={ShoppingBag} label="Orders" value={String(t.orders)} tone="blue" />
            <StatCard icon={Receipt} label="Average Order Value" value={formatCurrency(t.averageOrderValue)} tone="accent" />
            <StatCard icon={Percent} label="Commission Earned" value={formatCurrency(t.commission)} tone="primary" />
            <StatCard icon={Tag} label="Coupon Discounts Given" value={formatCurrency(t.discounts)} tone="earth" />
            <StatCard icon={UserPlus} label="New Customers" value={String(t.newCustomers)} tone="blue" />
          </div>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-lg font-bold text-stone-900">Daily Revenue</h2>
            <p className="mb-4 text-xs text-stone-400">
              {t.buyers} customer{t.buyers === 1 ? "" : "s"} bought · {t.cancelled} cancelled · {t.returned} returned
            </p>
            <DailyRevenueChart data={report.daily} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-stone-900">Item Sales by Category</h2>
              {report.byCategory.length === 0 ? (
                <p className="py-6 text-center text-sm text-stone-400">No sales in this period.</p>
              ) : (
                <div className="space-y-4">
                  {report.byCategory.map((c) => (
                    <BarRow
                      key={c.category}
                      label={`${categoryName(c.category)} · ${c.units} units`}
                      value={c.revenue}
                      max={report.byCategory[0].revenue}
                      display={formatCurrency(c.revenue)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-5 text-lg font-bold text-stone-900">Orders by Status</h2>
              <div className="space-y-4">
                {ALL_ORDER_STATUSES.map((status) => {
                  const count = report.byStatus[status] ?? 0;
                  return (
                    <BarRow
                      key={status}
                      label={ORDER_STATUS_LABELS[status]}
                      value={count}
                      max={Math.max(...Object.values(report.byStatus).map((n) => n ?? 0), 1)}
                      display={String(count)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-stone-900">Best-Selling Products</h2>
              <RankTable
                rows={report.topProducts.map((p) => ({ key: p.productId, name: p.name, units: p.units, revenue: p.revenue }))}
              />
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-bold text-stone-900">Sales by Seller</h2>
              <RankTable
                rows={report.bySeller.map((s) => ({
                  key: s.sellerId,
                  name: s.farmName,
                  detail: `${s.orders} order${s.orders === 1 ? "" : "s"}`,
                  units: s.units,
                  revenue: s.revenue,
                }))}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RankTable({ rows }: { rows: { key: string; name: string; detail?: string; units: number; revenue: number }[] }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-stone-400">No sales in this period.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-stone-100 text-xs font-bold uppercase text-stone-400">
          <th className="py-2 pr-4">Name</th>
          <th className="py-2 pr-4 text-right">Units</th>
          <th className="py-2 text-right">Item Sales</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-stone-50">
            <td className="py-2.5 pr-4">
              <p className="font-semibold text-stone-800">{r.name}</p>
              {r.detail && <p className="text-xs text-stone-400">{r.detail}</p>}
            </td>
            <td className="py-2.5 pr-4 text-right text-stone-600">{r.units}</td>
            <td className="py-2.5 text-right font-semibold text-stone-800">{formatCurrency(r.revenue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
