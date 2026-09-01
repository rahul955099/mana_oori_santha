import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <img
        src={category.image}
        alt={category.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/20 to-transparent" />
      <div className="relative p-5 text-white">
        <h3 className="text-xl font-bold">{category.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-white/80">{category.description}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-300">
          Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
