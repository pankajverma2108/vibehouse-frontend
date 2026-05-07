import Image from "next/image";

const assets = {
  heroSticker: "http://localhost:3845/assets/b2151ffd20606aff743c9461d9717e50b56e9c64.svg",
  heroCard: "http://localhost:3845/assets/321509ee187d1ebc7785fcdfaf8a49ca748900bf.png",
  eventSecondary: "http://localhost:3845/assets/d86672fa40b4ad598cc763bea75c0cbee55930a4.png",
  spacePrimary: "http://localhost:3845/assets/0490efee02cd88db6e4822d6f9a0fc4d778267c5.png",
  spaceSecondary: "http://localhost:3845/assets/bec8814c112c812b22caf3a423dce1d2c8e27835.png",
  guestOne: "http://localhost:3845/assets/7a8ae845b71237f567c61b690a22fc2f3ae9945c.png",
  guestTwo: "http://localhost:3845/assets/7fd6c0a2af0945845bbf9be57e8d3139df3fe2d3.png",
  guestThree: "http://localhost:3845/assets/4edb4892e87306272850545d176b5e48bd22a705.png",
  guestFour: "http://localhost:3845/assets/f8fc420cb7c05705be4bca12ab2ef4da45303ffc.png",
  guestFive: "http://localhost:3845/assets/72e56540b35bbd6becda81d3a35d6b44c2f5513b.png",
  guestSix: "http://localhost:3845/assets/50c993a15534441fd40873d06f714dc3b3203bfd.png",
  avatarOne: "http://localhost:3845/assets/065c28aacdba4f8e4927efcf5c064cff23fc4475.png",
  avatarTwo: "http://localhost:3845/assets/778e06f2da13c1fa77dac7b324c3a649609a57b2.png",
  avatarThree: "http://localhost:3845/assets/7606851c382d9f781b149120559d6120a71e4345.png"
};

const eventCards = [
  {
    label: "Live DJ Set",
    title: "Midnight Pulse: Urban Art Showcase",
    meta: "Starts 10:00 PM",
    cta: "Get Tickets",
    image: assets.heroCard,
    invert: false
  },
  {
    label: "Community",
    title: "Late Night Mixer: Creators Hub",
    meta: "Free Entry",
    cta: "RSVP",
    image: assets.eventSecondary,
    invert: true
  }
];

const spaceCards = [
  {
    eyebrow: "Signature Room",
    title: "The Neon Loft",
    description:
      "Industrial aesthetics meets high-end comfort. Featuring a custom mural by local artists and a private sound system for your late-night mixes.",
    tags: ["King Bed", "Hi-Fi Audio", "Balcony"],
    price: "$240",
    image: assets.spacePrimary,
    accent: true
  },
  {
    eyebrow: "Shared Experience",
    title: "The Mix Bunker",
    description:
      "Designed for groups and solo travelers who live for the community. Minimalist design with maximum personality.",
    tags: ["4 Bunks", "Secure Storage", "Gaming Zone"],
    price: "$65",
    image: assets.spaceSecondary,
    accent: false
  }
];

const gallery = [
  { src: assets.guestOne, className: "gallery-tall gallery-tilt-left" },
  { src: assets.guestTwo, className: "gallery-square" },
  { src: assets.guestThree, className: "gallery-square gallery-tilt-right" },
  { src: assets.guestFour, className: "gallery-tall" },
  { src: assets.guestFive, className: "gallery-square gallery-tilt-left" },
  { src: assets.guestSix, className: "gallery-square" }
];

const navItems = [
  { label: "Home", active: true },
  { label: "Events", active: false },
  { label: "Spaces", active: false },
  { label: "Profile", active: false }
];

export default function Home() {
  return (
    <main className="page-shell" data-node-id="38:2">
      <header className="topbar" data-node-id="38:170">
        <button className="icon-button" aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <div className="brand">vhdsgn</div>
        <button className="icon-button icon-button-accent" aria-label="Open bag">
          <span className="bag-icon" />
        </button>
      </header>

      <section className="hero section" data-node-id="38:3">
        <div className="hero-copy">
          <div className="hero-badge">Street Art Inspired</div>
          <h1>
            Stay <span>Mix</span>
            <br />
            Repeat
          </h1>
          <p>
            Design-forward rooms, live creative programming, and a late-night social energy built for people who travel with taste.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#spaces">
              Book Your Stay
            </a>
            <a className="text-link" href="#tonight">
              Check Availability
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-glow" />
          <div className="hero-sticker">
            <Image alt="Abstract graffiti symbol" fill sizes="220px" src={assets.heroSticker} unoptimized />
          </div>
          <div className="hero-panel">
            <div className="hero-panel-image">
              <Image alt="Crowd gathered around a DJ booth" fill priority sizes="(max-width: 768px) 100vw, 40vw" src={assets.heroCard} unoptimized />
            </div>
            <div className="hero-panel-copy">
              <span>Tonight&apos;s headliner</span>
              <strong>Midnight Pulse</strong>
              <p>Art, sound, and after-hours atmosphere layered into one stay.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="events section section-dark" data-node-id="38:24" id="tonight">
        <div className="section-heading">
          <p className="section-kicker">Don&apos;t miss the energy</p>
          <h2>Tonight at The Daily Social</h2>
        </div>

        <div className="events-grid">
          {eventCards.map((card) => (
            <article className="event-card" key={card.title}>
              <div className="event-media">
                <Image alt={card.title} fill sizes="(max-width: 768px) 100vw, 50vw" src={card.image} unoptimized />
              </div>
              <div className="event-overlay" />
              <div className="event-content">
                <span className="pill">{card.label}</span>
                <h3>{card.title}</h3>
                <div className="event-footer">
                  <span>{card.meta}</span>
                  <a className={card.invert ? "secondary-button light" : "secondary-button"} href="#book">
                    {card.cta}
                  </a>
                </div>
              </div>
            </article>
          ))}

          <article className="feature-card" data-node-id="38:47">
            <div className="feature-icon">✦</div>
            <h3>Guest Energy</h3>
            <p>
              Capture the vibe and tag us @vhdsgn to be featured on our main hall wall.
            </p>
            <div className="avatar-row">
              {[assets.avatarOne, assets.avatarTwo, assets.avatarThree].map((avatar) => (
                <div className="avatar" key={avatar}>
                  <Image alt="Guest portrait" fill sizes="40px" src={avatar} unoptimized />
                </div>
              ))}
              <div className="avatar avatar-more">+12</div>
            </div>
          </article>
        </div>
      </section>

      <section className="spaces section" data-node-id="38:85" id="spaces">
        <div className="section-heading inline-heading">
          <p className="section-kicker">Stay loud, sleep well</p>
          <h2>Our Spaces</h2>
        </div>

        <div className="spaces-grid">
          {spaceCards.map((space) => (
            <article className={space.accent ? "space-card space-card-accent" : "space-card"} key={space.title}>
              <div className="space-image-wrap">
                <Image alt={space.title} fill sizes="(max-width: 768px) 100vw, 50vw" src={space.image} unoptimized />
              </div>
              <div className="space-content">
                <span className="space-eyebrow">{space.eyebrow}</span>
                <h3>{space.title}</h3>
                <p>{space.description}</p>
                <div className="tag-row">
                  {space.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="space-footer" id="book">
                  <a className="primary-button" href="#">
                    Book Now
                  </a>
                  <div className="price-block">
                    <strong>{space.price}</strong>
                    <span>/night</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="energy section section-dark" data-node-id="38:148">
        <div className="section-heading centered">
          <p className="section-kicker">Captured by you, curated by us</p>
          <h2>The Energy</h2>
        </div>
        <div className="gallery-grid">
          {gallery.map((item, index) => (
            <div className={`gallery-card ${item.className}`} key={`${item.src}-${index}`}>
              <Image alt="Guest energy collage" fill sizes="(max-width: 768px) 50vw, 20vw" src={item.src} unoptimized />
            </div>
          ))}
        </div>
      </section>

      <footer className="footer section">
        <div>
          <p className="section-kicker">The Daily Social / vhdsgn</p>
          <h2>Sleep inside the scene.</h2>
        </div>
        <a className="primary-button" href="#spaces">
          Reserve a room
        </a>
      </footer>

      <nav className="bottom-nav" aria-label="Primary">
        {navItems.map((item) => (
          <a className={item.active ? "bottom-link active" : "bottom-link"} href="#" key={item.label}>
            <span className="bottom-icon" />
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
