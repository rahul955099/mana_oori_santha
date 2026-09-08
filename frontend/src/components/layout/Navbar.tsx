import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, User, Search, ChevronDown, LogOut, LayoutDashboard, Package } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { categories } from "@/data/categories";
import { LocationSelector } from "@/components/location/LocationSelector";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { SearchSuggestions } from "@/components/search/SearchSuggestions";
import { useRotatingPlaceholder } from "@/hooks/useRotatingPlaceholder";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { ROTATING_PLACEHOLDER_TERMS } from "@/data/searchTerms";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold transition-colors ${isActive ? "text-primary-700" : "text-stone-600 hover:text-primary-700"}`;

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { addRecentSearch } = useRecentSearches();
  const rotatingPlaceholder = useRotatingPlaceholder(ROTATING_PLACEHOLDER_TERMS, searchValue.length > 0);
  const navigate = useNavigate();

  function runSearch(term: string) {
    addRecentSearch(term);
    navigate(`/products?search=${encodeURIComponent(term)}`);
    setSearchOpen(false);
    setSearchFocused(false);
    setMobileSearchFocused(false);
    setSearchValue("");
  }

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (searchValue.trim()) runSearch(searchValue);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
      <div className="container-app flex h-20 items-center justify-between gap-4 py-3">
        <Logo size={38} />

        <nav className="hidden items-center gap-7 lg:flex">
          <NavLink to="/" className={navLinkClass} end>
            Home
          </NavLink>
          <div
            className="relative"
            onMouseEnter={() => setCategoriesOpen(true)}
            onMouseLeave={() => setCategoriesOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-primary-700">
              Categories <ChevronDown size={14} />
            </button>
            {categoriesOpen && (
              <div className="absolute left-0 top-full w-56 rounded-xl border border-stone-100 bg-white p-2 shadow-xl">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <NavLink to="/products" className={navLinkClass}>
            Products
          </NavLink>
          <NavLink to="/sellers" className={navLinkClass}>
            Sellers
          </NavLink>
          <NavLink to="/about" className={navLinkClass}>
            About
          </NavLink>
          <NavLink to="/contact" className={navLinkClass}>
            Contact
          </NavLink>
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <LocationSelector />

          <div className="relative hidden sm:block">
            {searchOpen ? (
              <form onSubmit={submitSearch} className="flex items-center">
                <input
                  autoFocus
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setSearchFocused(false);
                      if (!searchValue) setSearchOpen(false);
                    }, 150);
                  }}
                  placeholder={rotatingPlaceholder}
                  className="w-52 rounded-full border border-stone-200 py-2 pl-4 pr-9 text-sm outline-none focus:border-primary-400"
                />
                <button type="submit" className="absolute right-2 text-stone-400 hover:text-primary-600">
                  <Search size={16} />
                </button>
                {searchFocused && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-80 w-72 overflow-y-auto rounded-2xl border border-stone-100 bg-white shadow-2xl">
                    <SearchSuggestions query={searchValue} onSelectTerm={runSearch} onNavigate={() => setSearchOpen(false)} />
                  </div>
                )}
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            )}
          </div>

          {user?.role === "customer" && <NotificationBell />}

          <Link to="/cart" className="relative rounded-full p-2 text-stone-500 hover:bg-stone-100" aria-label="Cart">
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-earth-500 text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <div
              className="relative hidden sm:block"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button className="flex items-center gap-2 rounded-full bg-primary-50 py-1.5 pl-2 pr-3 text-sm font-semibold text-primary-700">
                <User size={16} /> {user.name.split(" ")[0]}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full w-48 rounded-xl border border-stone-100 bg-white p-2 shadow-xl">
                  {user.role === "seller" && (
                    <Link to="/seller/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-primary-50 hover:text-primary-700">
                      <LayoutDashboard size={15} /> Seller Dashboard
                    </Link>
                  )}
                  {user.role === "admin" && (
                    <Link to="/admin/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-primary-50 hover:text-primary-700">
                      <LayoutDashboard size={15} /> Admin Panel
                    </Link>
                  )}
                  {user.role === "customer" && (
                    <>
                      <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-primary-50 hover:text-primary-700">
                        <User size={15} /> My Profile
                      </Link>
                      <Link to="/my-orders" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-primary-50 hover:text-primary-700">
                        <Package size={15} /> My Orders
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => { logout(); navigate("/"); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 sm:flex"
            >
              <User size={16} /> Login
            </Link>
          )}

          <button
            className="rounded-full p-2 text-stone-600 hover:bg-stone-100 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-stone-100 bg-white px-4 pb-4 lg:hidden">
          <div className="border-b border-stone-100 py-1">
            <LocationSelector compact />
          </div>
          <form onSubmit={submitSearch} className="relative my-3">
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setMobileSearchFocused(true)}
              onBlur={() => setTimeout(() => setMobileSearchFocused(false), 150)}
              placeholder={rotatingPlaceholder}
              className="w-full rounded-full border border-stone-200 py-2.5 pl-4 pr-10 text-sm outline-none focus:border-primary-400"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
              <Search size={16} />
            </button>
            {mobileSearchFocused && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-stone-100 bg-white shadow-2xl">
                <SearchSuggestions query={searchValue} onSelectTerm={runSearch} onNavigate={() => setMobileOpen(false)} />
              </div>
            )}
          </form>
          <div className="flex flex-col gap-1">
            {[
              { to: "/", label: "Home" },
              { to: "/products", label: "Products" },
              { to: "/sellers", label: "Sellers" },
              { to: "/about", label: "About" },
              { to: "/contact", label: "Contact" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-primary-50"
              >
                {link.label}
              </Link>
            ))}
            <p className="mt-2 px-3 text-xs font-bold uppercase tracking-wide text-stone-400">Categories</p>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-primary-50"
              >
                {cat.name}
              </Link>
            ))}
            <div className="mt-3 border-t border-stone-100 pt-3">
              {user ? (
                <>
                  {user.role === "customer" && (
                    <>
                      <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-primary-50">
                        <User size={16} /> My Profile
                      </Link>
                      <Link to="/my-orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-primary-50">
                        <Package size={16} /> My Orders
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => { logout(); setMobileOpen(false); navigate("/"); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-full bg-primary-600 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-full border-2 border-primary-600 py-2.5 text-center text-sm font-semibold text-primary-700"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

