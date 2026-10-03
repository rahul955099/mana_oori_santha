import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { buttonClasses } from "@/components/common/Button";
import { Seo } from "@/components/common/Seo";

export default function NotFound() {
  return (
    <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <Seo title="Page not found" noIndex />
      <span className="text-7xl font-extrabold text-primary-200">404</span>
      <h1 className="mt-2 text-2xl font-extrabold text-stone-900">Page Not Found</h1>
      <p className="mt-2 max-w-sm text-stone-500">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/" className={buttonClasses("primary", "md", "mt-6")}>
        <Home size={16} /> Back to Home
      </Link>
    </div>
  );
}
