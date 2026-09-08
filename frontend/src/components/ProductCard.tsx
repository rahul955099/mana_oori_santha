import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";
import { Heart, Plus, Leaf } from "lucide-react";
import type { Product } from "@/types";
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
  const discount = discountPercent(product.price, product.mrp);
  const savings = product.mrp - product.price;
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110"
        >
          <Heart size={13} className={wishlisted ? "fill-red-500 text-red-500" : "text-stone-500"} />
        </button>
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-earth-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {discount}% OFF
          </span>
        )}
        {product.priceAvailable === false && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            Coming Soon
          </span>
        )}
        {product.isOrganic && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-primary-600/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm">
            <Leaf size={10} /> Organic
          </span>
        )}

        {/* Compact "+ ADD" action, anchored to the image like a modern grocery app */}
        <button
          onClick={handleAddToCart}
          disabled={!purchasable}
          aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full border border-primary-600 bg-white px-2.5 py-1 text-[11px] font-extrabold text-primary-700 shadow-sm transition-all duration-150 hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
        >
          <Plus size={12} strokeWidth={3} className="shrink-0" /> ADD
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-xs font-bold text-stone-800 group-hover:text-primary-700 sm:text-sm">
          {product.name}
        </h3>
        <p className="text-[11px] text-stone-400">{product.unit}</p>

        <div className="mt-1 flex items-baseline gap-1.5">
          {product.priceAvailable === false ? (
            <span className="text-sm font-extrabold text-stone-500">{product.priceLabel ?? "Price TBD"}</span>
          ) : (
            <>
              <span className="text-sm font-extrabold text-stone-900 sm:text-base">{formatCurrency(product.price)}</span>
              {discount > 0 && (
                <span className="text-[11px] text-stone-400 line-through">{formatCurrency(product.mrp)}</span>
              )}
            </>
          )}
        </div>

        {discount > 0 && (
          <span className="text-[11px] font-bold text-primary-700">{formatCurrency(savings)} OFF</span>
        )}

        <button
          onClick={handleBuyNow}
          disabled={!purchasable}
          className="mt-auto w-full rounded-full bg-primary-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:shadow-none sm:py-3"
        >
          Buy Now
        </button>
      </div>
    </Link>
  );
}
