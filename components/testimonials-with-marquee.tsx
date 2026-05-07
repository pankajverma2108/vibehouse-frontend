'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { heroImages, platformRatings, testimonials } from '@/content/home';

interface Review {
  text: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  source: string;
  link: string;
}

interface PlatformRating {
  name: string;
  rating: number;
  maxRating: number;
  logo: string;
  color: string;
}

interface RatingCount {
  platform: string;
  countLabel: string;
  logo: string;
  color: string;
  bgColor: string;
}

interface PhotoCard {
  url: string;
  alt: string;
}

type CarouselItem =
  | { type: 'review'; data: Review }
  | { type: 'photo'; data: PhotoCard }
  | { type: 'platform'; data: PlatformRating }
  | { type: 'count'; data: RatingCount };

const platformColors: Record<string, { color: string; bg: string }> = {
  Google: { color: '#34A853', bg: '#D9F1E6' },
  'Booking.com': { color: '#003580', bg: '#DDEBFF' },
  MakeMyTrip: { color: '#E7352B', bg: '#FFECE6' },
  Agoda: { color: '#5B2D90', bg: '#EFE5FF' },
};

const ratingDefaults: Record<string, { score: number; max: number }> = {
  Google: { score: 4.8, max: 5 },
  'Booking.com': { score: 9.0, max: 10 },
  MakeMyTrip: { score: 4.7, max: 5 },
  Agoda: { score: 4.6, max: 5 },
};

const REVIEWS: Review[] = testimonials.map((item) => ({
  text: item.review,
  author: item.name,
  location: item.country,
  rating: ratingDefaults[item.platform]?.score ?? 4.6,
  date: 'Recent stay',
  source: item.platform,
  link: '#',
}));

const PLATFORM_RATINGS: PlatformRating[] = platformRatings
  .filter((item) => item.logo)
  .slice(0, 3)
  .map((item) => {
    const parsed = Number(item.rating);
    const fallback = ratingDefaults[item.platform] ?? { score: Number.isFinite(parsed) ? parsed : 4.6, max: 5 };
    const maxRating = item.platform === 'Booking.com' ? 10 : fallback.max;

    return {
      name: item.platform,
      rating: Number.isFinite(parsed) ? parsed : fallback.score,
      maxRating,
      logo: item.logo ?? '',
      color: platformColors[item.platform]?.color ?? '#00d1ff',
    };
  });

const PLATFORM_COUNTS: RatingCount[] = PLATFORM_RATINGS.map((item) => {
  const detail = platformRatings.find((entry) => entry.platform === item.name)?.detail ?? '100+ reviews';
  const countLabel = detail.split(' ')[0] ?? '100+';

  return {
    platform: item.name,
    countLabel,
    logo: item.logo,
    color: platformColors[item.name]?.color ?? '#00d1ff',
    bgColor: platformColors[item.name]?.bg ?? '#DDEBFF',
  };
});

const PHOTOS: PhotoCard[] = [...heroImages, ...heroImages].map((url, index) => ({
  url,
  alt: `guest-photo-${index + 1}`,
}));

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROW_LENGTH = 18;
const ALTERNATING_PATTERN: ('review' | 'platform' | 'photo' | 'count')[] = [
  'review', 'photo', 'platform', 'review', 'photo', 'count', 'review', 'photo', 'platform',
  'review', 'photo', 'count', 'review', 'photo', 'platform', 'review', 'photo', 'count',
];

function buildPatternedRowFixedPlatform(
  photos: PhotoCard[],
  reviews: Review[],
  platformForRow: PlatformRating,
  countForRow: RatingCount,
  length = ROW_LENGTH,
) {
  const platformReviews = reviews.filter((review) => review.source === platformForRow.name);
  const photoPool = photos.slice();
  const reviewPool = shuffle(platformReviews.slice());
  const result: CarouselItem[] = new Array(length);

  let rp = 0;
  let ph = 0;

  for (let i = 0; i < length; i++) {
    const t = ALTERNATING_PATTERN[i % ALTERNATING_PATTERN.length];

    if (t === 'platform') {
      result[i] = { type: 'platform', data: platformForRow };
    } else if (t === 'count') {
      result[i] = { type: 'count', data: countForRow };
    } else if (t === 'photo') {
      if (photoPool.length) result[i] = { type: 'photo', data: photoPool.shift()! };
      else if (reviewPool.length) result[i] = { type: 'review', data: reviewPool.shift()! };
      else result[i] = { type: 'photo', data: photos[(ph++) % photos.length] };
    } else {
      if (reviewPool.length) result[i] = { type: 'review', data: reviewPool.shift()! };
      else if (photoPool.length) result[i] = { type: 'photo', data: photoPool.shift()! };
      else result[i] = { type: 'review', data: platformReviews[(rp++) % Math.max(1, platformReviews.length)] ?? reviews[0] };
    }
  }

  for (let i = 0; i < length; i++) {
    if (!result[i]) result[i] = { type: 'photo', data: photos[i % photos.length] };
  }

  return result;
}

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = review.text.length > 180;
  const normalizedRating = review.source === 'Booking.com'
    ? Math.round((review.rating / 10) * 5)
    : Math.round(review.rating);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const notifyRow = (expanded: boolean) => {
    const el = rootRef.current?.closest('[data-row-id]') as HTMLElement | null;
    if (el) {
      const ev = new CustomEvent('review-expand', { detail: { expanded } });
      el.dispatchEvent(ev);
    }
  };

  useEffect(() => {
    if (!isExpanded) return;
    const t = setTimeout(() => {
      setIsExpanded(false);
      notifyRow(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [isExpanded]);

  const toggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setIsExpanded((prev) => {
      const next = !prev;
      setTimeout(() => notifyRow(next), 0);
      return next;
    });
  };

  return (
    <div ref={rootRef} className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] rounded-xl border border-white/12 bg-[rgba(15,16,26,0.95)] p-3 flex flex-col tile transition-all duration-300 flex-shrink-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Image
            src={PLATFORM_RATINGS.find((item) => item.name === review.source)?.logo || '/testimonials logos/icons8-google-logo-96.png'}
            alt="logo"
            width={20}
            height={20}
            className="object-contain"
            style={{ width: "auto", height: "auto" }}
          />
          <span className="text-xs text-white/70 hidden md:block">{review.source}</span>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className={i < normalizedRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
          ))}
        </div>
      </div>

      <div className="flex-1 mb-1 overflow-hidden">
        <div className={`text-xs md:text-sm text-white/80 leading-relaxed custom-scroll ${isExpanded ? 'unclamped' : 'clamped'}`} onWheel={(ev) => ev.stopPropagation()}>
          {isExpanded ? review.text : (shouldTruncate ? `${review.text.slice(0, 160)}...` : review.text)}
        </div>
      </div>

      {shouldTruncate && (
        <div className="mb-1">
          <button
            onClick={toggle}
            className="text-xs text-[var(--vh-cyan)] hover:text-white font-medium"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        </div>
      )}

      <div className="mt-1">
        <p className="text-sm font-semibold text-white truncate">{review.author}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-white/55 truncate">{review.location}</p>
          <p className="text-xs font-medium text-white/55 truncate">{review.date}</p>
        </div>
      </div>
    </div>
  );
};

const PhotoCardComponent: React.FC<{ photo: PhotoCard }> = ({ photo }) => {
  return (
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] rounded-xl overflow-hidden tile transition-all duration-300 flex-shrink-0 border border-white/12 bg-[rgba(255,255,255,0.03)]">
      <Image src={photo.url} alt={photo.alt} width={560} height={480} className="h-full w-full object-cover" />
    </div>
  );
};

const PlatformCard: React.FC<{ platform: PlatformRating }> = ({ platform }) => {
  const [animateNumber, setAnimateNumber] = useState(false);
  useEffect(() => {
    let t: number | undefined;
    if (animateNumber) {
      t = window.setTimeout(() => setAnimateNumber(false), 1000);
    }
    return () => { if (t) window.clearTimeout(t); };
  }, [animateNumber]);

  const percentage = (platform.rating / platform.maxRating) * 100;
  const normalizedStars = platform.maxRating === 10
    ? Math.round((platform.rating / platform.maxRating) * 5)
    : Math.round(platform.rating);

  return (
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] rounded-xl border border-white/12 bg-[rgba(15,16,26,0.95)] p-4 flex flex-col items-center justify-center tile transition-all duration-300 flex-shrink-0" onMouseEnter={() => setAnimateNumber(true)} onTouchStart={() => setAnimateNumber(true)}>
      <Image
        src={platform.logo}
        alt={`${platform.name} logo`}
        width={78}
        height={68}
        className="mb-2 object-contain transition-transform duration-300"
        style={{ width: "auto", height: "auto" }}
      />
      <h3 className="text-sm md:text-lg font-bold text-white mb-1">{platform.name}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-lg md:text-2xl font-bold transition-transform" style={{ color: platform.color, transform: animateNumber ? 'scale(1.5)' : 'scale(1)', transition: 'transform 300ms ease' }}>{platform.rating}</span>
        <span className="text-sm md:text-xl text-white/55">/{platform.maxRating}</span>
      </div>
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} className={i < normalizedStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
        ))}
      </div>
      <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: platform.color }} />
      </div>
    </div>
  );
};

const CountCard: React.FC<{ count: RatingCount }> = ({ count }) => {
  const [animateNumber, setAnimateNumber] = useState(false);
  useEffect(() => {
    let t: number | undefined;
    if (animateNumber) t = window.setTimeout(() => setAnimateNumber(false), 1000);
    return () => { if (t) window.clearTimeout(t); };
  }, [animateNumber]);

  return (
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] rounded-xl border border-white/12 p-4 flex flex-col items-center justify-center tile transition-all duration-300 flex-shrink-0" style={{ backgroundColor: count.bgColor }} onMouseEnter={() => setAnimateNumber(true)} onTouchStart={() => setAnimateNumber(true)}>
      <div className="relative mb-2 flex items-center justify-center" style={{ width: 150, height: 90 }}>
        <div style={{ position: 'absolute', width: 84, height: 84, borderRadius: 9999, backgroundColor: count.color, opacity: 0.18, transform: 'translateY(-6px)' }} />
        <Image
          src={count.logo}
          alt={`${count.platform} logo`}
          width={96}
          height={72}
          className="object-contain transition-transform duration-300"
          style={{ zIndex: 2, width: "auto", height: "auto" }}
        />
      </div>

      <div className="text-2xl md:text-3xl font-extrabold transition-transform duration-200" style={{ color: count.color, transform: animateNumber ? 'scale(1.5)' : 'scale(1)', textShadow: '0 10px 28px rgba(0,0,0,0.12)', transition: 'transform 300ms ease' }}>{count.countLabel}</div>
      <div className="text-xs tracking-widest text-gray-500 mt-1">REVIEWS</div>
    </div>
  );
};

const InfiniteScrollRow: React.FC<{
  items: CarouselItem[];
  direction: 'left' | 'right';
  duration?: number;
  mobileDuration?: number;
  rowIndex?: number;
}> = ({ items, direction, duration = 70, mobileDuration, rowIndex = 0 }) => {
  const duplicated = [...items, ...items, ...items];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const expandedRef = useRef(false);
  const [isTouch] = useState(() => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  const resumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { expanded: boolean } | undefined;
      if (detail && typeof detail.expanded === 'boolean') {
        expandedRef.current = detail.expanded;
        setIsPaused(detail.expanded);
        if (detail.expanded && resumeTimerRef.current) {
          window.clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
      }
    };

    el.addEventListener('review-expand', handler as EventListener);
    return () => el.removeEventListener('review-expand', handler as EventListener);
  }, []);

  const onPointerDown = () => {
    setIsPaused(true);
    if (isTouch) {
      if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = window.setTimeout(() => {
        if (!expandedRef.current) setIsPaused(false);
        resumeTimerRef.current = null;
      }, 3000);
    }
  };

  const effectiveDuration = isTouch ? (mobileDuration ?? duration) : duration;
  const animationName = direction === 'right' ? 'scroll-right' : 'scroll-left';
  const phaseOffsetSeconds = -(rowIndex * (effectiveDuration / 3));

  return (
    <div
      className="relative w-full overflow-hidden py-1"
      data-row-id={rowIndex}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => { if (!expandedRef.current) setIsPaused(false); }}
    >
      <div className="flex gap-2 md:gap-4" style={{ animation: `${animationName} ${effectiveDuration}s linear infinite`, animationPlayState: isPaused ? 'paused' : 'running', width: 'max-content', animationDelay: `${phaseOffsetSeconds}s` }}>
        {duplicated.map((item, idx) => {
          const key = `${item.type}-${idx}`;

          if (item.type === 'review') {
            return (
              <a key={key} href={item.data.link} className="inline-block" onClick={(e) => e.preventDefault()}>
                <ReviewCard review={item.data} />
              </a>
            );
          }

          if (item.type === 'photo') {
            return <PhotoCardComponent key={key} photo={item.data} />;
          }

          if (item.type === 'platform') return <PlatformCard key={key} platform={item.data} />;
          return <CountCard key={key} count={item.data} />;
        })}
      </div>
    </div>
  );
};

export default function TestimonialsMarquee() {
  const platformRow1 = PLATFORM_RATINGS[0] ?? PLATFORM_RATINGS[PLATFORM_RATINGS.length - 1];
  const platformRow2 = PLATFORM_RATINGS[1] ?? PLATFORM_RATINGS[0];
  const platformRow3 = PLATFORM_RATINGS[2] ?? PLATFORM_RATINGS[0];

  const countRow1 = PLATFORM_COUNTS.find((c) => c.platform === platformRow1?.name) ?? PLATFORM_COUNTS[0];
  const countRow2 = PLATFORM_COUNTS.find((c) => c.platform === platformRow2?.name) ?? PLATFORM_COUNTS[0];
  const countRow3 = PLATFORM_COUNTS.find((c) => c.platform === platformRow3?.name) ?? PLATFORM_COUNTS[0];

  const photosPerRow = Math.ceil(PHOTOS.length / 3);
  const photosRow1 = PHOTOS.slice(0, photosPerRow);
  const photosRow2 = PHOTOS.slice(photosPerRow, photosPerRow * 2);
  const photosRow3 = PHOTOS.slice(photosPerRow * 2);

  const row1 = buildPatternedRowFixedPlatform(photosRow1, REVIEWS, platformRow1, countRow1, ROW_LENGTH);
  const row2 = buildPatternedRowFixedPlatform(photosRow2, REVIEWS, platformRow2, countRow2, ROW_LENGTH);
  const row3 = buildPatternedRowFixedPlatform(photosRow3, REVIEWS, platformRow3, countRow3, ROW_LENGTH);

  return (
    <section className="overflow-hidden bg-[#07070a] pb-8 pt-0">
      <div className="mx-auto w-[95vw] max-w-[1400px] px-1 md:px-3">
        <div className="text-center mb-3 px-4">
          <h2 className="vh-title text-[2rem] md:text-[2.7rem] text-white">Guests keep talking. We keep hosting.</h2>
        </div>

        <div className="space-y-1">
          <InfiniteScrollRow items={row1} direction="left" duration={70} mobileDuration={70} rowIndex={0} />
          <InfiniteScrollRow items={row2} direction="right" duration={80} mobileDuration={70} rowIndex={1} />
          <InfiniteScrollRow items={row3} direction="left" duration={70} mobileDuration={70} rowIndex={2} />
        </div>
      </div>

      <style>{`
        .tile { box-shadow: 0 8px 20px rgba(0,0,0,0.12); transition: box-shadow 220ms ease; }
        .tile:hover, .tile:active { box-shadow: 0 22px 48px rgba(0,0,0,0.22); }
        .custom-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #b8862b, #8f6b1d); border-radius: 999px; }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: #b8862b transparent; }
        .clamped { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .unclamped { max-height: 110px; overflow: auto; }
        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes scroll-right { 0% { transform: translateX(-33.333%); } 100% { transform: translateX(0); } }
      `}</style>
    </section>
  );
}