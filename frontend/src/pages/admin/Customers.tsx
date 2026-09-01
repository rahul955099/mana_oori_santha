import { useState } from "react";
import { Ban, CheckCircle2, Trash2 } from "lucide-react";
import { customers as initialCustomers, type Customer } from "@/data/customers";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/common/Badge";
import { formatDate } from "@/utils/format";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  function toggleStatus(id: string) {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === "active" ? "blocked" : "active" } : c))
    );
  }

  function removeCustomer(id: string) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Customers</h1>
      <p className="mt-1 text-sm text-stone-500">Manage registered customers on the platform.</p>

      <SearchBar value={search} onChange={setSearch} className="mt-6 max-w-md" placeholder="Search customers..." />

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50">
              <tr className="text-xs font-bold uppercase text-stone-400">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Orders</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id} className="border-t border-stone-100">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-stone-800">{customer.name}</p>
                    <p className="text-xs text-stone-400">{customer.email}</p>
                  </td>
                  <td className="px-5 py-3 text-stone-500">{customer.location}</td>
                  <td className="px-5 py-3 text-stone-500">{formatDate(customer.joinedDate)}</td>
                  <td className="px-5 py-3 text-stone-500">{customer.ordersCount}</td>
                  <td className="px-5 py-3">
                    <Badge tone={customer.status === "active" ? "green" : "red"}>
                      {customer.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleStatus(customer.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-primary-50 hover:text-primary-700"
                        title={customer.status === "active" ? "Block customer" : "Unblock customer"}
                      >
                        {customer.status === "active" ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                      </button>
                      <button
                        onClick={() => removeCustomer(customer.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
