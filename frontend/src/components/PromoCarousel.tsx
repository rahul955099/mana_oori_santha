import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PromoBanner } from "@/types";

const AUTOPLAY_MS = 4500;

export function PromoCarousel({ banners }: { banners: PromoBanner[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Scrolls the carousel's own horizontal track only. Deliberately NOT using
  // slide.scrollIntoView() here: even with block:"nearest", scrollIntoView
  // will scroll ANY scrollable ancestor — including the window — if the
  // slide isn't fully within the vertical viewport. Since this runs on a
  // 4.5s autoplay timer, that dragged the whole page back up to the hero
  // every tick whenever a user had scrolled further down the page.
  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;
    const target = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
    track.scrollTo({ left: target, behavior: "smooth" });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const next = (index + banners.length) % banners.length;
      setActiveIndex(next);
      scrollToIndex(next);
    },
    [banners.length, scrollToIndex],
  );

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, banners.length, scrollToIndex]);

  // Keep the active dot in sync when the user swipes/drags the track manually.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    function handleScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!track) return;
        const trackCenter = track.scrollLeft + track.clientWidth / 2;
        let closest = 0;
        let closestDist = Infinity;
        slideRefs.current.forEach((slide, i) => {
          if (!slide) return;
          const dist = Math.abs(slide.offsetLeft + slide.clientWidth / 2 - trackCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActiveIndex(closest);
      });
    }
    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (banners.length === 0) return null;

  return (
    <section
      className="container-app pt-6 sm:pt-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="relative">
        <div
          ref={trackRef}
          className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-0 lg:gap-4 lg:px-[6%]"
        >
          {banners.map((banner, i) => (
            <div
              key={banner.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="h-[140px] w-full shrink-0 snap-center sm:h-[165px] lg:h-[190px] lg:w-[88%]"
            >
              <Link
                to={banner.to}
                className="group relative flex h-full w-full flex-col justify-end overflow-hidden rounded-3xl shadow-lg"
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/25 to-transparent" />
                <div className="relative p-3 sm:p-4 lg:p-5">
                  <h3 className="max-w-lg text-balance text-xl font-extrabold leading-tight text-white sm:text-2xl lg:text-3xl">
                    {banner.title}
                  </h3>
                  <p className="mt-1 max-w-md text-balance text-xs text-white/85 sm:text-sm">
                    {banner.subtitle}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-xs font-bold text-white shadow-md transition group-hover:bg-accent-600 sm:text-sm">
                    {banner.ctaLabel}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous banner"
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-stone-700 shadow-md transition hover:bg-white sm:flex lg:left-4"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next banner"
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/90 p-2 text-stone-700 shadow-md transition hover:bg-white sm:flex lg:right-4"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {banners.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === activeIndex ? "w-6 bg-primary-700" : "w-2 bg-stone-300 hover:bg-stone-400"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
