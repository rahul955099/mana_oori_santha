import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LifeBuoy, Phone, Mail } from "lucide-react";
import { useSupport } from "@/context/SupportContext";
import { buttonClasses } from "@/components/common/Button";
import { SUPPORT_PHONE, SUPPORT_EMAIL, SUPPORT_PHONE_TEL_HREF, SUPPORT_EMAIL_MAILTO_HREF } from "@/config/support";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const SECTIONS: FaqSection[] = [
  {
    title: "Order Help",
    items: [
      { q: "How do I track my order?", a: "Go to My Orders from your profile menu to see the live status of every order you've placed." },
      { q: "Can I cancel an order after placing it?", a: "Orders can be cancelled while they're still Pending or Confirmed. Once shipped, use Return / Refund support instead." },
      { q: "I haven't received an order confirmation.", a: "Check your registered email and My Orders page. If it's still missing, raise an Order Issue with us." },
    ],
  },
  {
    title: "Delivery Help",
    items: [
      { q: "How is my delivery location used?", a: "Your saved delivery location and address determine estimated delivery time and availability shown on product and checkout pages." },
      { q: "My delivery is delayed.", a: "Delivery estimates can vary with farmer availability and location. Raise a Delivery Issue and share your Order ID for a quick update." },
    ],
  },
  {
    title: "Payment Help",
    items: [
      { q: "What payment methods are supported?", a: "Cash on Delivery and Online Payment (UPI/Card/Netbanking) are available at checkout." },
      { q: "My payment failed but amount was deducted.", a: "This is usually reversed automatically within a few days. If not, raise a Payment Issue with your Order ID." },
    ],
  },
  {
    title: "Returns & Refunds",
    items: [
      { q: "What is the return policy?", a: "Perishable items (dairy, fresh produce) are covered by our quality guarantee — contact support within 24 hours of delivery. Packaged goods (grains, flours, millets) can be returned within 7 days if unopened." },
      { q: "How long do refunds take?", a: "Once approved, refunds are processed to the original payment method within 5-7 business days." },
    ],
  },
  {
    title: "Product Help",
    items: [
      { q: "Are products really sourced from local farmers?", a: "Yes — every product page shows the specific farmer/seller it came from, with their profile, location and other products." },
      { q: "A product arrived damaged or different than described.", a: "Raise a Product Issue with your Order ID and we'll coordinate a replacement or refund with the farmer." },
    ],
  },
  {
    title: "Account Help",
    items: [
      { q: "How do I update my profile details?", a: "Go to Profile → Edit Profile to update your name, email, phone number and photo." },
      { q: "How do I manage delivery addresses?", a: "Go to Profile → My Addresses to add, edit, delete or set a default delivery address." },
      { q: "How do I delete my account?", a: "Go to Profile → Account Settings → Delete Account. You'll be asked to confirm before anything is removed." },
    ],
  },
];

export default function HelpCenter() {
  const { openSupport } = useSupport();
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenIndex((prev) => (prev === key ? null : key));
  }

  return (
    <div className="container-app py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-600">We're here to help</p>
        <h1 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">Help Center</h1>
        <p className="mt-3 text-stone-500">
          Answers to common questions about orders, delivery, payments, returns, products and your account.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl border border-stone-200 bg-white p-5">
              <h2 className="mb-3 text-lg font-bold text-stone-900">{section.title}</h2>
              <div className="divide-y divide-stone-100">
                {section.items.map((item, i) => {
                  const key = `${section.title}-${i}`;
                  const isOpen = openIndex === key;
                  return (
                    <div key={key} className="py-3">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className="flex w-full items-center justify-between gap-3 text-left"
                      >
                        <span className="text-sm font-semibold text-stone-800">{item.q}</span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen && <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.a}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700">
              <LifeBuoy size={22} />
            </div>
            <h3 className="text-base font-bold text-stone-900">Still need help?</h3>
            <p className="mt-1.5 text-sm text-stone-500">
              Reach our support team directly and we'll take it from there.
            </p>
            <button onClick={() => openSupport()} className={buttonClasses("primary", "md", "mt-4 w-full")}>
              Contact Support
            </button>
          </div>

          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5">
            <a href={SUPPORT_PHONE_TEL_HREF} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-primary-50">
              <Phone size={17} className="text-primary-600" />
              <span className="text-sm font-semibold text-stone-700">{SUPPORT_PHONE}</span>
            </a>
            <a href={SUPPORT_EMAIL_MAILTO_HREF} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-primary-50">
              <Mail size={17} className="text-primary-600" />
              <span className="text-sm font-semibold text-stone-700">{SUPPORT_EMAIL}</span>
            </a>
          </div>

          <Link to="/my-orders" className="block rounded-2xl border border-dashed border-stone-300 bg-white/60 p-5 text-center text-sm font-semibold text-stone-500 hover:border-primary-300 hover:text-primary-700">
            Have an order-specific issue? Open My Orders and use "Need Help?" on that order.
          </Link>
        </div>
      </div>
    </div>
  );
}
