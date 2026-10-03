import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { FacebookIcon, InstagramIcon, TwitterIcon } from "@/components/common/SocialIcons";
import { SOCIAL_LINKS } from "@/config/support";
import { useCategories } from "@/context/CategoriesContext";
import { SUPPORT_PHONE, SUPPORT_EMAIL } from "@/config/support";

export function Footer() {
  const { categories } = useCategories();
  return (
    <footer className="border-t border-stone-200 bg-primary-900 text-primary-50">
      <div className="container-app grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo size={38} dark />

          <p className="mt-4 text-sm leading-relaxed text-primary-200">
            Connecting you directly with local farmers and sellers for the most authentic, traditional and
            natural food products — the way nature intended.
          </p>
          <div className="mt-5 flex gap-3">
            {(
              [
                [FacebookIcon, "Facebook", SOCIAL_LINKS.facebook],
                [InstagramIcon, "Instagram", SOCIAL_LINKS.instagram],
                [TwitterIcon, "X (Twitter)", SOCIAL_LINKS.twitter],
              ] as const
            )
              .filter(([, , url]) => url)
              .map(([Icon, name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Mana Oori Santha on ${name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-800 text-primary-200 transition hover:bg-accent-500 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-accent-300">Quick Links</h4>
          <ul className="space-y-2.5 text-sm text-primary-200">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/products" className="hover:text-white">All Products</Link></li>
            <li><Link to="/sellers" className="hover:text-white">Our Sellers</Link></li>
            <li><Link to="/about" className="hover:text-white">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-accent-300">Categories</h4>
          <ul className="space-y-2.5 text-sm text-primary-200">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link to={`/category/${cat.slug}`} className="hover:text-white">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-accent-300">Get in Touch</h4>
          <ul className="space-y-3 text-sm text-primary-200">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" /> Hyderabad, Telangana, India
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0" /> {SUPPORT_PHONE}
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="shrink-0" /> {SUPPORT_EMAIL}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-primary-800 py-5">
        <p className="container-app text-center text-xs text-primary-300">
          © {new Date().getFullYear()} Mana Oori Santha. All rights reserved. Made with care for local farmers and
          honest food.
        </p>
      </div>
    </footer>
  );
}
