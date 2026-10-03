import { useState } from "react";
import { formatCurrency, formatDate } from "@/utils/format";

export interface DailyPoint {
  date: string;
  orders: number;
  revenue: number;
}

const HEIGHT = 180;

/** Revenue per day as columns from a shared baseline. Single series, so the
 * card title names it (no legend); hover or focus a day for exact figures,
 * and the table below gives the same data without hovering. */
export function DailyRevenueChart({ data }: { data: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const peakIndex = data.reduce((best, d, i) => (d.revenue > data[best].revenue ? i : best), 0);
  const hovered = active !== null ? data[active] : null;
  const hasSales = data.some((d) => d.revenue > 0);

  return (
    <div>
      <div className="relative" style={{ height: HEIGHT + 24 }} onMouseLeave={() => setActive(null)}>
        {/* Recessive gridlines at the baseline, half and max. */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute left-0 right-0 border-t border-stone-100" style={{ bottom: 24 + f * HEIGHT }}>
            <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] text-stone-400">{formatCurrency(Math.round(max * f))}</span>
          </div>
        ))}

        <div className="absolute bottom-6 left-0 right-12 flex items-end" style={{ height: HEIGHT, gap: 2 }}>
          {data.map((d, i) => (
            <button
              key={d.date}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${formatDate(d.date)}: ${formatCurrency(d.revenue)} from ${d.orders} order${d.orders === 1 ? "" : "s"}`}
              className="flex h-full min-w-0 flex-1 items-end justify-center outline-none"
            >
              {/* Hit target is the full column; the visible bar is capped at 24px. */}
              <span
                className={`w-full max-w-6 rounded-t transition-colors ${active === i ? "bg-primary-800" : "bg-primary-600"}`}
                style={{ height: d.revenue > 0 ? Math.max(2, (d.revenue / max) * HEIGHT) : 0 }}
              />
            </button>
          ))}
        </div>

        {/* Selective labels: first and last dates, plus the best day's value. */}
        <div className="absolute bottom-0 left-0 right-12 flex justify-between text-[10px] text-stone-400">
          <span>{formatDate(data[0].date)}</span>
          <span>{formatDate(data[data.length - 1].date)}</span>
        </div>
        {hasSales && active === null && (
          <p className="absolute right-12 top-0 text-[11px] text-stone-500">
            Best day: <span className="font-semibold text-stone-700">{formatDate(data[peakIndex].date)}</span> ·{" "}
            {formatCurrency(data[peakIndex].revenue)}
          </p>
        )}

        {hovered && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{ left: `min(calc(${((active! + 0.5) / data.length) * 100}% - 60px), calc(100% - 170px))` }}
          >
            <p className="font-semibold text-stone-800">{formatDate(hovered.date)}</p>
            <p className="text-stone-600">Revenue: {formatCurrency(hovered.revenue)}</p>
            <p className="text-stone-600">Orders: {hovered.orders}</p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-primary-700">Show as table</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-stone-400">
                <th className="py-1">Date</th>
                <th className="py-1 text-right">Orders</th>
                <th className="py-1 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-stone-50 text-stone-600">
                  <td className="py-1">{formatDate(d.date)}</td>
                  <td className="py-1 text-right">{d.orders}</td>
                  <td className="py-1 text-right">{formatCurrency(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
