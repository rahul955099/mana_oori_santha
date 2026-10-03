import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Heart, ShieldCheck, Truck, RotateCcw, MapPin } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { useSellers } from "@/context/SellersContext";
import { RatingStars } from "@/components/common/RatingStars";
import { Badge } from "@/components/common/Badge";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Loading } from "@/components/common/Loading";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, discountPercent, categoryLabel } from "@/utils/format";
import { DeliveryInfo } from "@/components/location/DeliveryInfo";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { optimizedImage } from "@/utils/image";
import { Seo } from "@/components/common/Seo";

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { products, getProductBySlug, loading } = useProducts();
  const { sellers } = useSellers();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const product = slug ? getProductBySlug(slug) : undefined;

  if (loading) {
    return <Loading label="Loading product..." />;
  }

  if (!product) {
    return (
      <div className="container-app py-16">
        <EmptyState
          title="Product not found"
          description="The product you're looking for doesn't exist or may have been removed."
          action={
            <Link to="/products" className="mt-2 text-sm font-bold text-primary-700 hover:underline">
              Browse all products
            </Link>
          }
        />
      </div>
    );
  }

  const seller = sellers.find((s) => s.id === product.sellerId);
  const discount = discountPercent(product.price, product.mrp);
  const gallery = [product.image, ...(product.images ?? [])].filter(Boolean);
  const mainPhoto = selectedPhoto && gallery.includes(selectedPhoto) ? selectedPhoto : product.image;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const purchasable = product.priceAvailable !== false && product.stock > 0;

  function handleAddToCart() {
    if (!product || !purchasable) return;
    addToCart(product.id, quantity);
    showToast(`${quantity} × ${product.name} added to cart`);
  }

  function handleBuyNow() {
    if (!product || !purchasable) return;
    addToCart(product.id, quantity);
    navigate("/cart");
  }

  return (
    <div className="container-app py-10">
      <Seo
        title={product.name}
        description={product.description || `${product.name} (${product.unit}) from local farmers.`}
        image={product.image}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: gallery,
          sku: product.id,
          ...(product.reviewCount > 0
            ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount } }
            : {}),
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: product.price,
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
      <nav className="mb-6 flex items-center gap-2 text-xs text-stone-400">
        <Link to="/" className="hover:text-primary-600">Home</Link> /
        <Link to="/products" className="hover:text-primary-600">Products</Link> /
        <Link to={`/category/${product.category}`} className="hover:text-primary-600">
          {categoryLabel(product.category)}
        </Link>{" "}
        / <span className="text-stone-600">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
        <div className="relative overflow-hidden rounded-3xl bg-stone-100">
          <img src={optimizedImage(mainPhoto, 900)} alt={product.name} className="aspect-square w-full object-cover" />
          {product.isOrganic && (
            <span className="absolute left-4 top-4 rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow">
              🌿 Organic Certified
            </span>
          )}
          {discount > 0 && (
            <span className="absolute right-4 top-4 rounded-full bg-earth-500 px-3 py-1.5 text-xs font-bold text-white shadow">
              {discount}% OFF
            </span>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setSelectedPhoto(url)}
                aria-label="Show photo"
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  url === mainPhoto ? "border-primary-500" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={optimizedImage(url, 160)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        </div>

        <div>
          <Badge tone="green">{categoryLabel(product.category)}</Badge>
          <h1 className="mt-3 text-3xl font-extrabold text-stone-900">{product.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          </div>

          {seller && (
            <Link
              to={`/sellers/${seller.id}`}
              className="mt-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 transition hover:border-primary-300"
            >
              <img src={seller.image} alt={seller.name} className="h-11 w-11 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-800">{seller.farmName}</p>
                <p className="flex items-center gap-1 text-xs text-stone-500">
                  <MapPin size={11} /> {seller.location}, {seller.state}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-primary-700">Visit Shop</span>
            </Link>
          )}

          <div className="mt-5 flex items-baseline gap-3">
            {product.priceAvailable === false ? (
              <span className="text-3xl font-extrabold text-stone-500">{product.priceLabel ?? "Price TBD"}</span>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-stone-900">{formatCurrency(product.price)}</span>
                {discount > 0 && (
                  <span className="text-lg text-stone-400 line-through">{formatCurrency(product.mrp)}</span>
                )}
              </>
            )}
            <span className="text-sm text-stone-500">/ {product.unit}</span>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-stone-600">{product.description}</p>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold text-stone-800">Benefits</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-sm text-stone-600">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 text-sm font-medium text-stone-500">
            Availability:{" "}
            {product.priceAvailable === false ? (
              <span className="font-bold text-accent-600">{product.priceLabel ?? "Price TBD"} — not yet available for purchase</span>
            ) : product.stock > 0 ? (
              <span className="font-bold text-primary-700">{product.stock} units in stock</span>
            ) : (
              <span className="font-bold text-red-600">Out of stock</span>
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border border-stone-300">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={!purchasable}
                className="flex h-11 w-11 items-center justify-center text-stone-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-bold text-stone-800">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                disabled={!purchasable}
                className="flex h-11 w-11 items-center justify-center text-stone-500 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:border-red-300 hover:text-red-500"
              aria-label="Wishlist"
            >
              <Heart size={18} className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : ""} />
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAddToCart}
              disabled={!purchasable}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-primary-600 px-6 py-3.5 text-sm font-bold text-primary-700 transition hover:bg-primary-50 disabled:opacity-50"
            >
              <ShoppingCart size={18} /> Add to Cart
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!purchasable}
              className="flex-1 rounded-full bg-primary-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 border-t border-stone-100 pt-6 sm:grid-cols-3">
            {[
              { icon: Truck, label: "Fast Delivery" },
              { icon: ShieldCheck, label: "Quality Assured" },
              { icon: RotateCcw, label: "Easy Returns" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs font-semibold text-stone-500">
                <item.icon size={16} className="text-primary-600" /> {item.label}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <DeliveryInfo />
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-2xl font-extrabold text-stone-900">Related Products</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
