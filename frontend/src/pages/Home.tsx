import { Link } from "react-router-dom";
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  Truck,
  Users,
  Search,
  ShoppingBag,
  PackageCheck,
  Sprout,
} from "lucide-react";
import { useCategories } from "@/context/CategoriesContext";
import { themedImage } from "@/utils/placeholder";
import { useSellers } from "@/context/SellersContext";
import { banners } from "@/data/banners";
import { CategoryCard } from "@/components/CategoryCard";
import { SellerCard } from "@/components/SellerCard";
import { PromoCarousel } from "@/components/PromoCarousel";
import { buttonClasses } from "@/components/common/Button";

export default function Home() {
  const { categories } = useCategories();
  const { sellers } = useSellers();
  return (
    <div>
      {/* PROMO CAROUSEL */}
      <PromoCarousel banners={banners} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />
        <div className="container-app relative grid grid-cols-1 items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-accent-300 backdrop-blur">
              <Sprout size={14} /> Direct from Local Farms
            </span>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Bringing <span className="text-accent-300">Mana Oori</span>{" "}
              traditions to your table
            </h1>
            <p className="mt-5 max-w-lg text-balance text-base text-primary-100 sm:text-lg">
              Shop authentic millets, dry fruits, pulses and seeds — grown
              naturally by local farmers and delivered straight to your
              doorstep. Pure, traditional and trustworthy.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/products"
                className={buttonClasses("secondary", "lg", "shadow-lg")}
              >
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link
                to="/#categories"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/40 px-8 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Explore Categories
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-8">
              <div>
                <p className="text-2xl font-extrabold text-white">500+</p>
                <p className="text-xs text-primary-200">Happy Customers</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">50+</p>
                <p className="text-xs text-primary-200">Local Sellers</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-white">100%</p>
                <p className="text-xs text-primary-200">Natural Products</p>
              </div>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              <img
                src={themedImage("indian farmer harvest grains", 401)}
                alt="Traditional produce"
                className="h-full w-full translate-y-8 rounded-3xl object-cover shadow-2xl"
              />
              <img
                src={themedImage("indian village farm field", 402)}
                alt="Local farmer"
                className="h-full w-full rounded-3xl object-cover shadow-2xl"
              />
            </div>
            <div className="absolute -left-6 bottom-6 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">
                  Quality Assured
                </p>
                <p className="text-xs text-stone-500">Verified local sellers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="container-app py-16 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-600">
            Our Categories
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">
            Shop by Category
          </h2>
          <p className="mt-3 text-stone-500">
            Explore our carefully curated range of traditional and natural food
            products.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>
      {/* WHY CHOOSE US */}
      <section className="container-app py-16 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-600">
            Our Promise
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">
            Why Choose Mana Oori Santha
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Leaf,
              title: "100% Natural",
              desc: "No chemicals, no shortcuts — just pure, traditional produce.",
            },
            {
              icon: Users,
              title: "Support Local Farmers",
              desc: "Every purchase directly supports local farming families.",
            },
            {
              icon: ShieldCheck,
              title: "Quality Assured",
              desc: "Every seller and product is verified for quality and trust.",
            },
            {
              icon: Truck,
              title: "Doorstep Delivery",
              desc: "Fresh products delivered quickly, right to your home.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                <item.icon size={26} />
              </div>
              <h3 className="text-base font-bold text-stone-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-stone-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-primary-50 py-16 sm:py-20">
        <div className="container-app">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-accent-600">
              Simple Process
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">
              How It Works
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                icon: Search,
                step: "01",
                title: "Browse & Discover",
                desc: "Explore natural products from verified local sellers.",
              },
              {
                icon: ShoppingBag,
                step: "02",
                title: "Add to Cart & Order",
                desc: "Pick your favourites and place your order in a few clicks.",
              },
              {
                icon: PackageCheck,
                step: "03",
                title: "Fast Doorstep Delivery",
                desc: "Sit back while your fresh order reaches your home.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-primary-700 shadow-md">
                  <item.icon size={30} />
                </div>
                <span className="mt-4 block text-xs font-extrabold text-accent-500">
                  STEP {item.step}
                </span>
                <h3 className="mt-1 text-lg font-bold text-stone-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-stone-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCAL SELLERS */}
      <section className="container-app py-16 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-accent-600">
              Meet Our Farmers
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">
              Local Sellers & Farmers
            </h2>
          </div>
          <Link
            to="/sellers"
            className="flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:underline"
          >
            View All Sellers <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-app pb-16 sm:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent-500 to-earth-500 px-6 py-14 text-center shadow-xl sm:px-16">
          <h2 className="text-balance text-3xl font-extrabold text-white sm:text-4xl">
            Taste the Tradition. Support Local Farmers.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-balance text-white/90">
            Join thousands of families choosing authentic, natural food —
            sourced responsibly from Mana Oori Santha's trusted local sellers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-accent-700 shadow-lg transition hover:scale-105"
            >
              Start Shopping <ArrowRight size={18} />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white px-8 py-4 text-base font-bold text-white transition hover:bg-white/10"
            >
              Become a Seller
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
