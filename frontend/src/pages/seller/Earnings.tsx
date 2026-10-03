import { IndianRupee, TrendingUp, Wallet, Clock } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { useOrders } from "@/context/OrdersContext";
import { formatCurrency, formatDate } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";

export default function SellerEarnings() {
  const sellerId = useAuth().user?.sellerId;
  const { orders } = useOrders();


  // Cancelled and returned orders earn nothing. The API returns only this seller's items.
  const relevantOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const isMine = (i: { sellerId: string }) => i.sellerId === sellerId;

  const totalEarnings = relevantOrders.reduce(
    (sum, o) => sum + o.items.filter(isMine).reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );

  const delivered = relevantOrders.filter((o) => o.status === "delivered");
  const settledEarnings = delivered.reduce(
    (sum, o) => sum + o.items.filter(isMine).reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );
  const pendingEarnings = totalEarnings - settledEarnings;
  const platformFeeRate = 0.05;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Earnings</h1>
      <p className="mt-1 text-sm text-stone-500">Track your revenue and payouts.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={IndianRupee} label="Total Earnings" value={formatCurrency(totalEarnings)} tone="primary" />
        <StatCard icon={TrendingUp} label="Settled (Delivered)" value={formatCurrency(settledEarnings)} tone="blue" />
        <StatCard icon={Clock} label="Pending Settlement" value={formatCurrency(pendingEarnings)} tone="earth" />
        <StatCard icon={Wallet} label="Platform Fee (5%)" value={formatCurrency(totalEarnings * platformFeeRate)} tone="accent" />
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-stone-900">Transaction History</h2>
        {relevantOrders.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs font-bold uppercase text-stone-400">
                  <th className="py-2 pr-4">Order ID</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Payment</th>
                </tr>
              </thead>
              <tbody>
                {relevantOrders.map((order) => {
                  const amount = order.items
                    .filter(isMine)
                    .reduce((s, i) => s + i.price * i.quantity, 0);
                  return (
                    <tr key={order.id} className="border-b border-stone-50">
                      <td className="py-3 pr-4 font-semibold text-stone-800">{order.id}</td>
                      <td className="py-3 pr-4 text-stone-500">{formatDate(order.date)}</td>
                      <td className="py-3 pr-4 font-semibold text-primary-700">{formatCurrency(amount)}</td>
                      <td className="py-3 pr-4 text-stone-500">
                        {order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
