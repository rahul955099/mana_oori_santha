import { Leaf, Users, ShieldCheck, Heart } from "lucide-react";
import { sellers } from "@/data/sellers";
import { SellerCard } from "@/components/SellerCard";
import { themedImage } from "@/utils/placeholder";

export default function About() {
  return (
    <div>
      <section className="bg-primary-800 py-16 text-center text-white">
        <div className="container-app">
          <p className="text-sm font-bold uppercase tracking-widest text-accent-300">Our Story</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-balance text-4xl font-extrabold sm:text-5xl">
            Rooted in Tradition, Growing with Trust
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-primary-100">
            Mana Oori Santha (translating to "Our Village Market") was born from a simple idea — connect the
            honest, hardworking farmers of our villages directly with families who value real, natural food.
          </p>
        </div>
      </section>

      <section className="container-app grid grid-cols-1 gap-10 py-16 lg:grid-cols-2">
        <img
          src={themedImage("indian village farming traditional", 501, 700)}
          alt="Village farming"
          className="rounded-3xl object-cover shadow-lg"
        />
        <div className="flex flex-col justify-center">
          <h2 className="text-3xl font-extrabold text-stone-900">Our Mission</h2>
          <p className="mt-4 text-stone-600">
            For generations, our villages have grown millets, pulses, seeds and dry fruits using traditional,
            sustainable farming methods — free from harmful chemicals. Yet these farmers rarely get fair value
            for their produce.
          </p>
          <p className="mt-4 text-stone-600">
            Mana Oori Santha exists to change that. We built a simple, trustworthy marketplace where local
            sellers can reach customers directly, and where customers can be confident about exactly where their
            food comes from.
          </p>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container-app">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-stone-900">What We Stand For</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Leaf, title: "Natural First", desc: "Only authentic, minimally processed traditional foods." },
              { icon: Users, title: "Farmer First", desc: "Fair prices and direct access to customers for every seller." },
              { icon: ShieldCheck, title: "Trust Always", desc: "Every seller is verified before joining our platform." },
              { icon: Heart, title: "Community Driven", desc: "Built for and with local communities across India." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-stone-200 p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <item.icon size={26} />
                </div>
                <h3 className="text-base font-bold text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-app py-16">
        <h2 className="mb-10 text-center text-3xl font-extrabold text-stone-900">The Farmers Behind Your Food</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      </section>
    </div>
  );
}
