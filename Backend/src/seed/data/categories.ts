import type { SeedCategory as Category } from "../types";
import { themedImage } from "../placeholder";

export const categories: Category[] = [
  {
    id: "cat-1",
    name: "Millets",
    slug: "millets",
    description:
      "Ancient, nutrient-rich grains grown by local farmers using traditional, chemical-free methods. Perfect for a wholesome, healthy diet.",
    image: themedImage("millet grains", 201),
    productCount: 11,
  },
  {
    id: "cat-2",
    name: "Dry Fruits & Nuts",
    slug: "dry-fruits",
    description:
      "Handpicked, naturally dried fruits and nuts — rich in flavour and nutrition, sourced directly from trusted regional growers.",
    image: themedImage("dry fruits nuts assortment", 202),
    productCount: 7,
  },
  {
    id: "cat-3",
    name: "Pulses",
    slug: "pulses",
    description:
      "Farm-fresh dals and legumes, cleaned and packed with care — a staple of traditional Indian kitchens for generations.",
    image: themedImage("lentils pulses dal", 203),
    productCount: 8,
  },
  {
    id: "cat-4",
    name: "Seeds",
    slug: "seeds",
    description:
      "Wholesome seeds packed with essential nutrients, sun-dried and processed the natural way by our partner farmers.",
    image: themedImage("seeds assortment", 204),
    productCount: 6,
  },
  {
    id: "cat-5",
    name: "Rice",
    slug: "rice",
    description:
      "Traditional and organic rice varieties, sourced from village mills and cleaned the natural way for everyday cooking.",
    image: themedImage("rice grains bowl", 207),
    productCount: 2,
  },
  {
    id: "cat-6",
    name: "Oil",
    slug: "oil",
    description:
      "Cold-pressed, chemical-free cooking oils extracted the traditional way to retain natural flavour and nutrition.",
    image: themedImage("sesame oil bottle", 208),
    productCount: 1,
  },
  {
    id: "cat-7",
    name: "Powders",
    slug: "powders",
    description:
      "Stone-ground spice and masala powders, made fresh in small batches for authentic home-style flavour.",
    image: themedImage("chilli powder spice", 209),
    productCount: 1,
  },
  {
    id: "cat-10",
    name: "Flours",
    slug: "flours",
    description:
      "Freshly stone-ground flours made from quality millets and grains — no additives, milled fresh for maximum nutrition.",
    image: themedImage("flour sack grains", 210),
    productCount: 7,
  },
  {
    id: "cat-11",
    name: "Dairy Products",
    slug: "dairy",
    description:
      "Pure, fresh dairy sourced daily from local farms — milk, curd, ghee and more, delivered with care.",
    image: themedImage("fresh dairy milk products", 211),
    productCount: 6,
  },
];

export const futureCategories: Category[] = [
  {
    id: "cat-8",
    name: "Spices",
    slug: "spices",
    description: "Aromatic, sun-dried spices sourced straight from village farms.",
    image: themedImage("indian spices", 205),
    productCount: 0,
  },
  {
    id: "cat-9",
    name: "Traditional Foods",
    slug: "traditional-foods",
    description: "Homemade snacks and traditional foods made using age-old recipes.",
    image: themedImage("indian traditional food", 206),
    productCount: 0,
  },
];
