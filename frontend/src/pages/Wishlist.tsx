import { Link } from "react-router-dom";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { useProducts } from "@/context/ProductsContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClasses } from "@/components/common/Button";
import { formatCurrency } from "@/utils/format";

export default function Wishlist() {
  const { wishlist, toggleWishlist } = useWishlist();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  function handleMoveToCart(productId: string, name: string) {
    addToCart(productId, 1);
    toggleWishlist(productId);
    showToast(`${name} moved to cart`);
  }

  function handleRemove(productId: string, name: string) {
    toggleWishlist(productId);
    showToast(`${name} removed from wishlist`, "info");
  }

  if (wishlistedProducts.length === 0) {
    return (
      <div className="container-app py-16">
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Tap the heart icon on any product to save it here for later."
          action={
            <Link to="/products" className={buttonClasses("primary", "md", "mt-2")}>
              Browse Products
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-app py-10">
      <h1 className="mb-8 text-3xl font-extrabold text-stone-900">My Wishlist</h1>
      <div className="space-y-4">
        {wishlistedProducts.map((product) => {
          const purchasable = product.priceAvailable !== false && product.stock > 0;
          return (
            <div
              key={product.id}
              className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"
            >
              <Link to={`/products/${product.slug}`} className="shrink-0">
                <img src={product.image} alt={product.name} className="h-24 w-24 rounded-xl object-cover" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.slug}`} className="font-bold text-stone-800 hover:text-primary-700">
                  {product.name}
                </Link>
                <p className="text-xs text-stone-400">{product.unit}</p>
                <p className="mt-1 text-sm font-bold text-stone-900">
                  {product.priceAvailable === false ? (product.priceLabel ?? "Price TBD") : formatCurrency(product.price)}
                </p>
                {!purchasable && <p className="mt-0.5 text-xs font-semibold text-red-500">Currently unavailable</p>}
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <button
                  onClick={() => handleMoveToCart(product.id, product.name)}
                  disabled={!purchasable}
                  className="flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  <ShoppingCart size={13} /> Move to Cart
                </button>
                <button
                  onClick={() => handleRemove(product.id, product.name)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
