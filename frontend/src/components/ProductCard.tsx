import { Link, useNavigate } from "react-router-dom";
import type { MouseEvent } from "react";
import { Heart, Plus, Leaf } from "lucide-react";
import type { Product } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { formatCurrency, discountPercent, teluguName } from "@/utils/format";
import { optimizedImage } from "@/utils/image";
import { QuantityStepper } from "@/components/cart/QuantityStepper";

export function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth();
  const { addToCart, quantityOf } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const discount = discountPercent(product.price, product.mrp);
  const savings = product.mrp - product.price;
  const wishlisted = isWishlisted(product.id);
  const purchasable = product.priceAvailable !== false && product.stock > 0;
  const productPath = `/products/${product.slug}`;
  const nameTe = teluguName(product);
  const hasSizes = (product.sizes?.length ?? 0) > 0;

  function redirectToLogin() {
    navigate("/login", { state: { from: { pathname: productPath } } });
  }

  /** Sized products need a size first, so ADD opens the product page. */
  function handleChooseSize(e: MouseEvent) {
    e.preventDefault();
    if (purchasable) navigate(productPath);
  }

  function handleBuyNow(e: MouseEvent) {
    e.preventDefault();
    if (!purchasable) return;
    if (hasSizes) {
      navigate(productPath);
      return;
    }
    // Already in the cart: go there with the chosen quantity rather than adding another.
    if (quantityOf(product.id) === 0) addToCart(product.id, 1, { silent: true });
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-stone-100">
        <img
          src={optimizedImage(product.image, 400)}
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

        {product.stock <= 0 && product.priceAvailable !== false && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-stone-900/70 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white">
            Out of stock
          </span>
        )}

        {/* Compact "+ ADD" action, anchored to the image like a modern grocery app.
            Guests can shop; their cart joins their account when they log in at checkout. */}
        <div className="absolute bottom-2 right-2">
          {hasSizes ? (
            <button
              onClick={handleChooseSize}
              disabled={!purchasable}
              aria-label={`Choose a size of ${product.name}`}
              className="flex h-8 items-center gap-0.5 rounded-full border border-primary-600 bg-white px-3 text-[11px] font-extrabold text-primary-700 shadow-sm transition-all duration-150 hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
            >
              <Plus size={12} strokeWidth={3} className="shrink-0" /> ADD
            </button>
          ) : (
            <QuantityStepper product={product} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 break-words text-xs font-bold text-stone-800 group-hover:text-primary-700 sm:text-sm">
          {product.name}
        </h3>
        {nameTe && (
          <p lang="te" className="line-clamp-1 break-words text-[11px] font-medium leading-snug text-stone-500 sm:text-xs" title={nameTe}>
            {nameTe}
          </p>
        )}
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
