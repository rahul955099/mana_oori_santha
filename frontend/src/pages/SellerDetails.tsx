import { Link, useParams } from "react-router-dom";
import { BadgeCheck, MapPin, Phone, Mail, Calendar, Package, Sprout, Images } from "lucide-react";
import { useSellers } from "@/context/SellersContext";
import { useProducts } from "@/context/ProductsContext";
import { RatingStars } from "@/components/common/RatingStars";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { buttonClasses } from "@/components/common/Button";

export default function SellerDetails() {
  const { id } = useParams<{ id: string }>();
  const { products } = useProducts();
  const { sellers, loading } = useSellers();
  const seller = sellers.find((s) => s.id === id);
  const sellerProducts = products.filter((p) => p.sellerId === id);

  if (loading) {
    return <Loading label="Loading farmer profile..." />;
  }

  if (!seller) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Seller not found"
          description="This seller profile doesn't exist."
          action={
            <Link to="/sellers" className="mt-2 text-sm font-bold text-primary-700 hover:underline">
              Browse all sellers
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-primary-800 py-14">
        <div className="container-app flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="relative shrink-0">
            <img
              src={seller.image}
              alt={seller.name}
              className="h-28 w-28 rounded-full object-cover ring-4 ring-primary-600"
            />
            {seller.verified && (
              <BadgeCheck size={26} className="absolute -bottom-1 -right-1 rounded-full bg-white fill-primary-600 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{seller.farmName}</h1>
            <p className="mt-1 text-primary-200">{seller.name}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-primary-100 sm:justify-start">
              <span className="flex items-center gap-1.5"><MapPin size={15} /> {seller.location}, {seller.state}</span>
              <span className="flex items-center gap-1.5"><Calendar size={15} /> Since {seller.joinedYear}</span>
              <span className="flex items-center gap-1.5"><Package size={15} /> {seller.productsCount} products</span>
            </div>
            <div className="mt-3 flex justify-center sm:justify-start">
              <RatingStars rating={seller.rating} reviewCount={seller.reviewCount} />
            </div>
          </div>
        </div>
      </div>

      <div className="container-app py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="mb-2 text-sm font-bold text-stone-800">About the Seller</h3>
              <p className="text-sm leading-relaxed text-stone-600">{seller.about}</p>
              {(seller.farmingType || seller.experienceYears) && (
                <div className="mt-4 flex items-start gap-2.5 border-t border-stone-100 pt-4">
                  <Sprout size={15} className="mt-0.5 shrink-0 text-primary-600" />
                  <div className="text-sm text-stone-600">
                    {seller.farmingType && <p className="font-semibold text-stone-800">{seller.farmingType}</p>}
                    {seller.experienceYears && <p className="text-xs text-stone-400">{seller.experienceYears}+ years of experience</p>}
                  </div>
                </div>
              )}
              {seller.mainProducts && seller.mainProducts.length > 0 && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Main Crops/Products</p>
                  <div className="flex flex-wrap gap-1.5">
                    {seller.mainProducts.map((p) => (
                      <span key={p} className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-stone-800">Contact</h3>
              <ul className="space-y-3 text-sm text-stone-600">
                <li className="flex items-center gap-2.5"><Phone size={15} className="text-primary-600" /> {seller.phone}</li>
                <li className="flex items-center gap-2.5"><Mail size={15} className="text-primary-600" /> {seller.email}</li>
              </ul>
              <a href={`tel:${seller.phone.replace(/\s/g, "")}`} className={buttonClasses("primary", "md", "mt-4 w-full")}>
                Contact Seller
              </a>
            </div>
          </aside>

          <div>
            {seller.photos && seller.photos.length > 0 && (
              <div className="mb-10">
                <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-stone-900">
                  <Images size={20} className="text-primary-600" /> Shop & Farm Photos
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {seller.photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo}
                      alt={`${seller.farmName} — photo ${i + 1}`}
                      loading="lazy"
                      className="aspect-square w-full rounded-xl object-cover shadow-sm"
                    />
                  ))}
                </div>
              </div>
            )}

            <h2 className="mb-6 text-2xl font-extrabold text-stone-900">Products by {seller.farmName}</h2>
            {sellerProducts.length === 0 ? (
              <EmptyState title="No products listed yet" description="This seller hasn't added any products." />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3">
                {sellerProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
