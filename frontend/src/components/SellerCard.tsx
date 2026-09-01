import { Link } from "react-router-dom";
import { MapPin, Package, BadgeCheck } from "lucide-react";
import type { Seller } from "@/types";
import { RatingStars } from "@/components/common/RatingStars";
import { buttonClasses } from "@/components/common/Button";

export function SellerCard({ seller }: { seller: Seller }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative">
        <img
          src={seller.image}
          alt={seller.name}
          className="h-20 w-20 rounded-full object-cover ring-4 ring-primary-50"
        />
        {seller.verified && (
          <BadgeCheck size={20} className="absolute -bottom-1 -right-1 rounded-full bg-white fill-primary-600 text-white" />
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-stone-900">{seller.farmName}</h3>
      <p className="text-xs text-stone-500">{seller.name}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
        <MapPin size={13} /> {seller.location}, {seller.state}
      </p>
      <div className="mt-2">
        <RatingStars rating={seller.rating} reviewCount={seller.reviewCount} size={13} />
      </div>
      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-stone-500">
        <Package size={13} /> {seller.productsCount} products
      </p>
      <Link to={`/sellers/${seller.id}`} className={buttonClasses("outline", "sm", "mt-4 w-full")}>
        View Products
      </Link>
    </div>
  );
}
