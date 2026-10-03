import { useProducts } from "@/context/ProductsContext";
import { useOrders } from "@/context/OrdersContext";
import { useCategories } from "@/context/CategoriesContext";
import { formatCurrency } from "@/utils/format";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/utils/orderStatus";

const statusOptions = ALL_ORDER_STATUSES;

export default function AdminReports() {
  const { categories } = useCategories();
  const { products } = useProducts();
  const { orders } = useOrders();

  const revenueByCategory = categories.map((cat) => {
    const revenue = orders.filter((o) => o.status !== "cancelled" && o.status !== "returned").reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((s, item) => (item.category === cat.slug ? s + item.price * item.quantity : s), 0)
      );
    }, 0);
    return { ...cat, revenue };
  });
  const maxRevenue = Math.max(...revenueByCategory.map((c) => c.revenue), 1);

  const ordersByStatus = statusOptions.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));
  const maxOrders = Math.max(...ordersByStatus.map((s) => s.count), 1);

  const topProducts = [...products].sort((a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount).slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Reports</h1>
      <p className="mt-1 text-sm text-stone-500">Marketplace performance insights.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-5 text-lg font-bold text-stone-900">Revenue by Category</h2>
          <div className="space-y-4">
            {revenueByCategory.map((cat) => (
              <div key={cat.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-stone-600">{cat.name}</span>
                  <span className="font-bold text-stone-900">{formatCurrency(cat.revenue)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${(cat.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="mb-5 text-lg font-bold text-stone-900">Orders by Status</h2>
          <div className="space-y-4">
            {ordersByStatus.map((item) => (
              <div key={item.status}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-stone-600">{ORDER_STATUS_LABELS[item.status]}</span>
                  <span className="font-bold text-stone-900">{item.count}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-accent-500"
                    style={{ width: `${(item.count / maxOrders) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-2">
          <h2 className="mb-5 text-lg font-bold text-stone-900">Top Performing Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs font-bold uppercase text-stone-400">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Rating</th>
                  <th className="py-2 pr-4">Reviews</th>
                  <th className="py-2 pr-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr key={product.id} className="border-b border-stone-50">
                    <td className="flex items-center gap-3 py-3 pr-4">
                      <img src={product.image} alt={product.name} className="h-9 w-9 rounded-lg object-cover" />
                      <span className="font-semibold text-stone-800">{product.name}</span>
                    </td>
                    <td className="py-3 pr-4 text-stone-600">★ {product.rating}</td>
                    <td className="py-3 pr-4 text-stone-600">{product.reviewCount}</td>
                    <td className="py-3 pr-4 font-semibold text-stone-800">{formatCurrency(product.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
