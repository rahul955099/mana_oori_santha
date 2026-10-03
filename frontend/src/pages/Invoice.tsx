import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Printer, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Loading } from "@/components/common/Loading";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import { api, errorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS } from "@/utils/orderStatus";
import type { Order } from "@/types";

const PAYMENT_STATUS_LABELS: Record<Order["paymentStatus"], string> = {
  pending: "To be paid on delivery",
  paid: "Paid (cash on delivery)",
  refunded: "Refunded",
};

/** Printable invoice. "Save as PDF" in the browser's print dialog downloads it. */
export default function Invoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ order: Order }>(`/orders/${id}`)
      .then(({ order }) => setOrder(order))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Invoice not available"
          description={error}
          action={
            <Link to="/my-orders" className={buttonClasses("primary", "md", "mt-2")}>
              Back to My Orders
            </Link>
          }
        />
      </div>
    );
  }
  if (!order) {
    return <Loading label="Loading invoice..." />;
  }

  const c = order.customer;

  return (
    <div className="min-h-screen bg-stone-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-between px-4 print:hidden">
        <button onClick={() => navigate(-1)} className={buttonClasses("ghost", "sm")}>
          <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} className={buttonClasses("primary", "sm")}>
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl bg-white p-8 shadow-sm sm:p-10 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-stone-200 pb-6">
          <div>
            <Logo size={40} />
            <p className="mt-2 text-xs text-stone-500">Local marketplace for natural &amp; traditional foods</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-extrabold text-stone-900">Invoice</h1>
            <p className="mt-1 text-sm font-semibold text-stone-700">{order.id}</p>
            <p className="text-xs text-stone-500">Order date: {formatDate(order.createdAt)}</p>
            <p className="text-xs text-stone-500">Status: {ORDER_STATUS_LABELS[order.status]}</p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 border-b border-stone-200 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-stone-400">Deliver to</p>
            <p className="font-semibold text-stone-800">{c.fullName}</p>
            <p className="text-stone-600">{c.address}</p>
            <p className="text-stone-600">
              {[c.village, c.district, c.state].filter(Boolean).join(", ")} - {c.pincode}
            </p>
            <p className="text-stone-600">{c.mobile}</p>
            <p className="text-stone-600">{c.email}</p>
          </div>
          <div className="sm:text-right">
            <p className="mb-1 text-xs font-bold uppercase text-stone-400">Payment</p>
            <p className="text-stone-700">Cash on Delivery</p>
            <p className="text-stone-600">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs font-bold uppercase text-stone-400">
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Price</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId} className="border-b border-stone-100">
                <td className="py-2.5">
                  <p className="font-semibold text-stone-800">{item.name}</p>
                  <p className="text-xs text-stone-400">{item.unit}</p>
                </td>
                <td className="py-2.5 text-right text-stone-600">{formatCurrency(item.price)}</td>
                <td className="py-2.5 text-right text-stone-600">{item.quantity}</td>
                <td className="py-2.5 text-right font-semibold text-stone-800">{formatCurrency(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {order.partial ? (
          <p className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            This order also contains items from other sellers, which are not shown here.
          </p>
        ) : (
          <dl className="ml-auto mt-6 w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-primary-700">
                <dt>Discount {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                <dd>-{formatCurrency(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <dt>Delivery</dt>
              <dd>{order.deliveryCharge === 0 ? "FREE" : formatCurrency(order.deliveryCharge)}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-extrabold text-stone-900">
              <dt>Total</dt>
              <dd>{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        )}

        <footer className="mt-10 border-t border-stone-200 pt-4 text-center text-xs text-stone-400">
          Thank you for supporting local farmers. This is a computer-generated invoice.
        </footer>
      </article>
    </div>
  );
}
