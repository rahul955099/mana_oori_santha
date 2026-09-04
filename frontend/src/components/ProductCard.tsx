import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";
import { Heart, ShoppingCart, Leaf } from "lucide-react";
import type { Product } from "@/types";
import { sellers } from "@/data/sellers";
import { RatingStars } from "@/components/common/RatingStars";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, discountPercent } from "@/utils/format";

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const seller = sellers.find((s) => s.id === product.sellerId);
  const discount = discountPercent(product.price, product.mrp);
  const wishlisted = isWishlisted(product.id);
  const purchasable = product.priceAvailable !== false && product.stock > 0;
  const productPath = `/products/${product.slug}`;

  function redirectToLogin() {
    navigate("/login", { state: { from: { pathname: productPath } } });
  }

  function handleCardClick(e: MouseEvent) {
    if (!user) {
      e.preventDefault();
      redirectToLogin();
    }
  }

  function handleAddToCart(e: MouseEvent) {
    e.preventDefault();
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!purchasable) return;
    addToCart(product.id, 1);
    showToast(`${product.name} added to cart`);
  }

  function handleBuyNow(e: MouseEvent) {
    e.preventDefault();
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!purchasable) return;
    addToCart(product.id, 1);
    navigate("/cart");
  }

  function handleWishlist(e: MouseEvent) {
    e.preventDefault();
    if (!user) {
      redirectToLogin();
      return;
    }
    toggleWishlist(product.id);
  }

  return (
    <Link
      to={productPath}
      onClick={handleCardClick}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <button
          onClick={handleWishlist}
          aria-label="Toggle wishlist"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
        >
          <Heart size={16} className={wishlisted ? "fill-red-500 text-red-500" : "text-stone-500"} />
        </button>
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-earth-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            {discount}% OFF
          </span>
        )}
        {product.priceAvailable === false && (
          <span className="absolute left-3 top-3 rounded-full bg-stone-700 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
            Coming Soon
          </span>
        )}
        {product.isOrganic && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-primary-600/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Leaf size={11} /> Organic
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-bold text-stone-800 group-hover:text-primary-700">
          {product.name}
        </h3>
        {seller && <p className="text-xs text-stone-400">by {seller.farmName}</p>}
        <RatingStars rating={product.rating} reviewCount={product.reviewCount} size={12} />

        <div className="mt-1 flex items-baseline gap-2">
          {product.priceAvailable === false ? (
            <span className="text-lg font-extrabold text-stone-500">{product.priceLabel ?? "Price TBD"}</span>
          ) : (
            <>
              <span className="text-lg font-extrabold text-stone-900">{formatCurrency(product.price)}</span>
              {discount > 0 && (
                <span className="text-xs text-stone-400 line-through">{formatCurrency(product.mrp)}</span>
              )}
            </>
          )}
          <span className="text-xs text-stone-400">/ {product.unit}</span>
        </div>

        <div className="mt-auto flex items-stretch gap-2 pt-3">
          <button
            onClick={handleAddToCart}
            disabled={!purchasable}
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-full border border-primary-600 px-1 text-[11px] font-semibold leading-tight tracking-tighter text-primary-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-700 hover:bg-primary-50 hover:shadow-md active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:border-stone-300 disabled:hover:bg-transparent disabled:hover:shadow-none sm:min-h-12"
          >
            <ShoppingCart size={12} className="shrink-0" />
            Add to Cart
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!purchasable}
            className="flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] font-bold leading-tight tracking-tighter text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg active:translate-y-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-stone-300 disabled:hover:shadow-none sm:min-h-12"
          >
            Buy Now
          </button>
        </div>
      </div>
    </Link>
  );
}
