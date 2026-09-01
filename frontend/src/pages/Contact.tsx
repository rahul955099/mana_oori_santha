import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { buttonClasses } from "@/components/common/Button";

const inputClass =
  "w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100";

export default function Contact() {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    showToast("Message sent! We'll get back to you soon.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="container-app py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-accent-600">Get in Touch</p>
        <h1 className="mt-2 text-3xl font-extrabold text-stone-900 sm:text-4xl">Contact Us</h1>
        <p className="mt-3 text-stone-500">
          Have a question about an order, a product or becoming a seller? We'd love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {[
            { icon: MapPin, title: "Address", value: "Hyderabad, Telangana, India" },
            { icon: Phone, title: "Phone", value: "+91 90000 12345" },
            { icon: Mail, title: "Email", value: "hello@manaoorisantha.in" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <item.icon size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400">{item.title}</p>
                <p className="text-sm font-semibold text-stone-800">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input required placeholder="Your Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            <input required type="email" placeholder="Your Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </div>
          <textarea
            required
            rows={5}
            placeholder="Your Message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className={`${inputClass} resize-none`}
          />
          <button type="submit" className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
            <Send size={16} /> Send Message
          </button>
        </form>
      </div>
    </div>
  );
}
