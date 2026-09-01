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

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={!purchasable}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-primary-600 px-3 py-2 text-xs font-bold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 disabled:hover:bg-transparent"
          >
            <ShoppingCart size={14} /> Add to Cart
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!purchasable}
            className="flex-1 rounded-full bg-primary-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Buy Now
          </button>
        </div>
      </div>
    </Link>
  );
}
