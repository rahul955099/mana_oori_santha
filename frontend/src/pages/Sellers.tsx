import { useState } from "react";
import { useSellers } from "@/context/SellersContext";
import { SellerCard } from "@/components/SellerCard";
import { SearchBar } from "@/components/common/SearchBar";
import { EmptyState } from "@/components/common/EmptyState";

export default function Sellers() {
  const { sellers } = useSellers();
  const [search, setSearch] = useState("");

  const filtered = sellers.filter(
    (s) =>
      s.farmName.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-app py-12">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-600">Meet Our Community</p>
        <h1 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">Local Sellers &amp; Farmers</h1>
        <p className="mt-3 text-stone-500">
          Every product on Mana Oori Santha comes from a verified local seller or farmer. Get to know the people
          behind your food.
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by seller, farm or location..."
        className="mx-auto mb-10 max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState title="No sellers found" description="Try a different search term." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  );
}
