import { Link } from "react-router-dom";
import { Ruler, MessageCircle, Scissors, PackageCheck } from "lucide-react";
import { useProducts } from "@/context/ProductsContext";
import { ProductCard } from "@/components/ProductCard";
import { Loading } from "@/components/common/Loading";
import { Seo } from "@/components/common/Seo";

/** Category slugs the server creates at startup (see Backend migrations). */
const SECTIONS = [
  { slug: "dresses", title: "Dresses", blurb: "Everyday comfort and occasion wear, picked for you." },
  { slug: "sarees", title: "Sarees", blurb: "Silk, cotton and designer sarees for every celebration." },
  { slug: "customised-dresses", title: "Customised Dresses", blurb: "Your design, your measurements, stitched for you." },
] as const;

const CUSTOM_STEPS = [
  { icon: MessageCircle, title: "Share your idea", text: "Send a photo or describe the dress you want." },
  { icon: Ruler, title: "Give measurements", text: "We guide you through taking them at home." },
  { icon: Scissors, title: "We stitch it", text: "Made to your size with the fabric you choose." },
  { icon: PackageCheck, title: "Delivered to you", text: "Pay cash on delivery when it arrives." },
];

const LOGO = "/assets/maad-fashions-logo.png";

/** MAAD Fashions: a boutique-style page for dresses, sarees and custom stitching. */
export default function Fashion() {
  const { products, loading } = useProducts();

  return (
    <div className="bg-white">
      <Seo title="MAAD Fashions" description="Dresses, elegant sarees and customised fashion from MAAD Fashions, on Mana Oori Santha." />

      {/* Boutique bar */}
      <div className="border-b border-maad-100 bg-white">
        <div className="container-app flex flex-col items-center gap-3 py-4 sm:flex-row sm:justify-between">
          <img src={LOGO} alt="MAAD Luxury Fashion Store" className="h-20 w-auto" width={422} height={332} />
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm font-medium text-stone-600">
            <a href="#top" className="hover:text-maad-700">Home</a>
            {SECTIONS.map((s) => (
              <a key={s.slug} href={`#${s.slug}`} className="hover:text-maad-700">
                {s.title}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section id="top" className="scroll-mt-24 bg-gradient-to-br from-maad-50 via-white to-maad-100">
        <div className="container-app grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-maad-700">Welcome to MAAD Fashions</p>
            <h1 className="mt-6 font-serif text-5xl leading-tight text-maad-900 sm:text-6xl lg:text-7xl">
              Elegance That
              <br />
              <em className="text-maad-700">Defines You</em>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-600">
              Discover beautiful dresses, elegant sarees and customised fashion designed specially for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#dresses" className="rounded-full bg-maad-700 px-7 py-3 font-semibold text-white shadow-lg shadow-maad-700/20 hover:bg-maad-800">
                Explore Collection
              </a>
              <a href="#customised-dresses" className="rounded-full border border-maad-200 bg-white px-7 py-3 font-semibold text-maad-800 hover:border-maad-300 hover:bg-maad-50">
                Customise Your Dress
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm">
            <div className="rounded-t-full bg-white p-4 shadow-2xl shadow-maad-300/30">
              <div className="flex aspect-[4/5] items-center justify-center rounded-t-full bg-gradient-to-b from-maad-100 via-white to-maad-50">
                <img src={LOGO} alt="" className="w-4/5 drop-shadow-sm" width={422} height={332} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      {loading ? (
        <Loading label="Loading the collection..." />
      ) : (
        SECTIONS.map((section, i) => {
          const items = products.filter((p) => p.category === section.slug);
          return (
            <section key={section.slug} id={section.slug} className={`scroll-mt-24 py-16 ${i % 2 ? "bg-maad-50" : "bg-white"}`}>
              <div className="container-app">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-3xl text-maad-900 sm:text-4xl">{section.title}</h2>
                    <p className="mt-2 text-stone-500">{section.blurb}</p>
                  </div>
                  {items.length > 0 && (
                    <Link to={`/category/${section.slug}`} className="text-sm font-semibold text-maad-700 hover:underline">
                      View all {section.title}
                    </Link>
                  )}
                </div>

                {section.slug === "customised-dresses" && (
                  <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {CUSTOM_STEPS.map((step, n) => (
                      <div key={step.title} className="rounded-2xl border border-maad-100 bg-white p-5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-maad-100 text-maad-700">
                            <step.icon size={18} />
                          </span>
                          <span className="text-xs font-bold uppercase tracking-widest text-maad-500">Step {n + 1}</span>
                        </div>
                        <p className="mt-3 font-semibold text-stone-800">{step.title}</p>
                        <p className="mt-1 text-sm text-stone-500">{step.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {items.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                    {items.slice(0, 8).map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-maad-200 bg-white/70 px-6 py-12 text-center">
                    <p className="font-serif text-2xl text-maad-800">New arrivals coming soon</p>
                    <p className="mt-2 text-sm text-stone-500">
                      {section.slug === "customised-dresses"
                        ? "Want something made for you now? Tell us what you have in mind."
                        : `Our ${section.title.toLowerCase()} collection is being added. Check back shortly.`}
                    </p>
                  </div>
                )}

                {section.slug === "customised-dresses" && (
                  <div className="mt-8 text-center">
                    <Link to="/contact" className="inline-block rounded-full bg-maad-700 px-7 py-3 font-semibold text-white hover:bg-maad-800">
                      Request a Custom Dress
                    </Link>
                  </div>
                )}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
