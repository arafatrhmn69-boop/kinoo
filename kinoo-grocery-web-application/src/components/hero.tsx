"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useKinoo } from "@/components/cart-provider";
import { STORE, formatTaka } from "@/lib/kinoo";

type Slide = {
  id: string;
  pill: string;
  title: string;
  emphasis: string;
  body: string;
  primary: string;
  primaryHref: string;
  secondary: string;
  secondaryHref: string;
  image: string;
};

const SLIDES: Slide[] = [
  {
    id: "fresh",
    pill: "Fresh from the haat",
    title: "Your neighbourhood bazar,",
    emphasis: "now at your door.",
    body: "Hand-picked vegetables, Padma ilish and everyday staples — weighed fresh and delivered across Dhaka in 90 minutes.",
    primary: "Shop fresh picks",
    primaryHref: "/#shop",
    secondary: "See daily deals",
    secondaryHref: "/#deals",
    image:
      "https://images.pexels.com/photos/37321079/pexels-photo-37321079.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=800",
  },
  {
    id: "mango",
    pill: "Summer special",
    title: "Himsagar mangoes,",
    emphasis: "straight from Rajshahi.",
    body: "Hay-ripened, fibre-free and sweet to the last bite. Order a kilo before the season slips away.",
    primary: "Grab the mango deal",
    primaryHref: "/#deals",
    secondary: "Browse fruits",
    secondaryHref: "/?category=fruits-vegetables#shop",
    image:
      "https://images.pexels.com/photos/37342495/pexels-photo-37342495.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=800",
  },
  {
    id: "dairy",
    pill: "Farm to fridge",
    title: "Milk, eggs & doi,",
    emphasis: "every single morning.",
    body: "Chilled Aarong milk, date-stamped Kazi Farms eggs and set mishti doi — breakfast solved before 8 am.",
    primary: "Shop dairy & eggs",
    primaryHref: "/?category=dairy-eggs#shop",
    secondary: "Today's deals",
    secondaryHref: "/#deals",
    image:
      "https://images.pexels.com/photos/37377280/pexels-photo-37377280.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=800",
  },
  {
    id: "fish",
    pill: "Today's catch",
    title: "Ilish from the Padma,",
    emphasis: "cut to order.",
    body: "Ice-fresh fish and halal meat, cleaned by our fishmongers and packed with a zero-mess promise.",
    primary: "Shop fish & meat",
    primaryHref: "/?category=fish-meat#shop",
    secondary: "How delivery works",
    secondaryHref: "/#shop",
    image:
      "https://images.pexels.com/photos/12955692/pexels-photo-12955692.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1400&h=800",
  },
];

const TRUST = [
  { icon: "bi-patch-check-fill", title: "Freshness promise", copy: "Hand-checked daily" },
  { icon: "bi-truck", title: "60–90 min delivery", copy: "Across Dhaka city" },
  { icon: "bi-cash-coin", title: "Cash on delivery", copy: "bKash & Nagad too" },
  { icon: "bi-arrow-counterclockwise", title: "Easy returns", copy: "Not fresh? Refunded" },
];

export function Hero() {
  const { cart } = useKinoo();
  const [active, setActive] = useState(0);
  const [clock, setClock] = useState<{ h: string; m: string; s: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, 6200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(end.getTime() - now.getTime(), 0);
      const hours = Math.floor(diff / 3_600_000);
      const minutes = Math.floor((diff % 3_600_000) / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setClock({
        h: String(hours).padStart(2, "0"),
        m: String(minutes).padStart(2, "0"),
        s: String(seconds).padStart(2, "0"),
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(STORE.freeDeliveryThreshold - cart.subtotal, 0);
  const progress = Math.min((cart.subtotal / STORE.freeDeliveryThreshold) * 100, 100);

  return (
    <>
      <section className="hero-grid" aria-label="Kinoo highlights">
        <div className="hero-carousel">
          {SLIDES.map((slide, index) => (
            <div className={`hero-slide ${index === active ? "active" : ""}`} key={slide.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-slide-img" src={slide.image} alt="" />
              <div className="hero-copy">
                <span className="hero-pill">
                  <i className="bi bi-stars" aria-hidden="true" />
                  {slide.pill}
                </span>
                <h1>
                  {slide.title} <em>{slide.emphasis}</em>
                </h1>
                <p>{slide.body}</p>
                <div className="hero-actions">
                  <Link className="btn-light-green" href={slide.primaryHref}>
                    {slide.primary}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Link>
                  <Link className="btn-outline-light" href={slide.secondaryHref}>
                    {slide.secondary}
                  </Link>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="hero-arrow prev"
            aria-label="Previous slide"
            onClick={() => setActive((current) => (current - 1 + SLIDES.length) % SLIDES.length)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hero-arrow next"
            aria-label="Next slide"
            onClick={() => setActive((current) => (current + 1) % SLIDES.length)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>

          <div className="hero-dots">
            {SLIDES.map((slide, index) => (
              <button
                type="button"
                key={slide.id}
                className={index === active ? "on" : ""}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        </div>

        <div className="hero-side">
          <div className="side-card side-deal">
            <span className="sd-badge">
              <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> Flash deal
            </span>
            <div>
              <h3>Up to 30% off</h3>
              <p>On rice, oil, ilish &amp; 30+ everyday essentials.</p>
            </div>
            <div className="countdown" aria-label="Time left today">
              <span>{clock?.h ?? "00"}</span>
              <span>{clock?.m ?? "00"}</span>
              <span>{clock?.s ?? "00"}</span>
            </div>
            <Link className="side-link" href="/#deals">
              Shop the deals <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="side-card side-delivery">
            <span className="sd-icon">
              <i className="bi bi-truck" aria-hidden="true" />
            </span>
            <div>
              <h3>Free delivery over {formatTaka(STORE.freeDeliveryThreshold)}</h3>
              <p>
                {cart.count === 0
                  ? "Fill your bag and ride free — Dhaka-wide."
                  : remaining > 0
                    ? `Add ${formatTaka(remaining)} more to unlock it.`
                    : "Unlocked! Your delivery is on us."}
              </p>
            </div>
            <div className="side-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="trust-strip">
        {TRUST.map((item) => (
          <div className="trust-item" key={item.title}>
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <div>
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
