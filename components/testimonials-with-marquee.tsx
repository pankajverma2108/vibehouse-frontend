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
  Google: { color: '#4285F4', bg: 'rgba(66, 133, 244, 0.12)' },
  'Booking.com': { color: '#003580', bg: 'rgba(0, 53, 128, 0.18)' },
  Booking: { color: '#003580', bg: 'rgba(0, 53, 128, 0.18)' },
  Airbnb: { color: '#FF5A5F', bg: 'rgba(255, 90, 95, 0.15)' },
  MakeMyTrip: { color: '#e41d25', bg: 'rgba(228, 29, 37, 0.15)' },
  Agoda: { color: '#5B2D90', bg: 'rgba(91, 45, 144, 0.15)' },
  Hostelworld: { color: '#f1592a', bg: 'rgba(241, 89, 42, 0.15)' },
};

const ratingDefaults: Record<string, { score: number; max: number }> = {
  Google: { score: 4.8, max: 5 },
  'Booking.com': { score: 8.9, max: 10 },
  Booking: { score: 8.9, max: 10 },
  Airbnb: { score: 4.9, max: 5 },
  MakeMyTrip: { score: 4.6, max: 5 },
  Agoda: { score: 8.7, max: 10 },
  Hostelworld: { score: 9.3, max: 10 },
};

const REVIEWS: Review[] = testimonials.map((item) => ({
  text: item.review,
  author: item.name,
  location: item.country,
  rating: 5,
  date: 'Verified Guest',
  source: item.platform,
  link: 'https://maps.app.goo.gl/K1D2x2pP6uK7Z9Q96',
}));

const PLATFORM_RATINGS: PlatformRating[] = platformRatings
  .map((item) => {
    const pColor = platformColors[item.platform]?.color ?? '#4285F4';
    const numScore = parseFloat(item.rating) || 4.5;
    const dMax = numScore > 5 ? 10 : 5;
    return {
      name: item.platform,
      rating: numScore,
      maxRating: dMax,
      logo: item.logo ?? '/testimonials logos/icons8-google-logo-96.png',
      color: pColor,
    };
  });

const PLATFORM_COUNTS: RatingCount[] = PLATFORM_RATINGS.map((item) => {
  const pColor = platformColors[item.name]?.color ?? '#4285F4';
  const pBg = platformColors[item.name]?.bg ?? 'rgba(255, 255, 255, 0.03)';
  const countLabel = item.name.includes('Google') ? '3.4k+' : item.name.includes('Booking') ? '2.1k+' : '1.3k+';
  return {
    platform: item.name,
    countLabel,
    logo: item.logo,
    color: pColor,
    bgColor: pBg,
  };
});

const PHOTOS: PhotoCard[] = [...heroImages, ...heroImages].map((url, index) => ({
  url,
  alt: `Hostel vibe photo ${index + 1}`,
}));

function deterministicRotate<T>(arr: T[], offset: number): T[] {
  if (arr.length === 0) return [];
  const shift = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(shift), ...arr.slice(0, shift)];
}

const ROW_LENGTH = 16;

function buildPatternedRowFixedPlatform(
  photos: PhotoCard[],
  reviews: Review[],
  platform: PlatformRating,
  count: RatingCount,
  rowIndex: number,
  length = ROW_LENGTH
): CarouselItem[] {
  const out: CarouselItem[] = [];
  const rotReviews = deterministicRotate(reviews, rowIndex * 2);
  const rotPhotos = deterministicRotate(photos, rowIndex * 3);
  let rIndex = 0;
  let pIndex = 0;

  const cycle = ['review', 'photo', 'review', 'platform', 'photo', 'count'];

  for (let i = 0; i < length; i++) {
    const t = cycle[i % cycle.length];
    if (t === 'platform') {
      out.push({ type: 'platform', data: platform });
    } else if (t === 'count') {
      out.push({ type: 'count', data: count });
    } else if (t === 'review') {
      out.push({ type: 'review', data: rotReviews[rIndex % rotReviews.length] });
      rIndex++;
    } else {
      out.push({ type: 'photo', data: rotPhotos[pIndex % rotPhotos.length] });
      pIndex++;
    }
  }

  for (let i = 0; i < length; i++) {
    if (out[i]?.type === 'count') {
      const prevIdx = (i - 1 + length) % length;
      const nextIdx = (i + 1) % length;
      if (out[prevIdx]?.type === 'count' || out[nextIdx]?.type === 'count') {
        const swapWith = (i + 3) % length;
        const tmp = out[i];
        out[i] = out[swapWith];
        out[swapWith] = tmp;
      }
    }
  }

  return out;
}

const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const shouldTruncate = review.text.length > 180;

  const notifyRow = (expanded: boolean) => {
    const el = cardRef.current?.closest('[data-row-id]');
    if (el) {
      el.dispatchEvent(new CustomEvent('review-expand', { detail: { expanded }, bubbles: true }));
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
      notifyRow(next);
      return next;
    });
  };

  return (
    <div
      ref={cardRef}
      className={`w-[260px] md:w-[340px] ${
        isExpanded ? 'h-auto md:h-auto z-40' : 'h-[210px] md:h-[240px]'
      } glass-panel rounded-2xl border border-white/10 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex-shrink-0 cursor-pointer`}
      onClick={toggle}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] font-mono font-bold uppercase tracking-[0.16em] text-[#E01E5A]">
          {review.source}
        </span>
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < review.rating ? 'fill-[#E01E5A] text-[#E01E5A]' : 'text-gray-700'}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 mb-1 overflow-hidden">
        <div
          className={`text-xs md:text-sm text-white/85 leading-relaxed custom-scroll font-body ${
            isExpanded ? 'unclamped' : 'clamped'
          }`}
          onWheel={(ev) => ev.stopPropagation()}
        >
          {isExpanded ? review.text : shouldTruncate ? `${review.text.slice(0, 160)}...` : review.text}
        </div>
      </div>

      {shouldTruncate && (
        <div className="mb-1">
          <button
            onClick={toggle}
            className="text-xs text-[#E01E5A] hover:text-white font-mono font-bold uppercase tracking-[0.06em] cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        </div>
      )}

      <div className="mt-2 border-t border-white/10 pt-2.5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-white font-display truncate">
          {review.author}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[10px] text-white/50 font-body truncate">{review.location}</p>
          <p className="text-[10px] font-mono font-medium text-white/50 truncate">{review.date}</p>
        </div>
      </div>
    </div>
  );
};

const PhotoCardComponent: React.FC<{ photo: PhotoCard }> = ({ photo }) => {
  return (
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_20px_40px_rgba(0,0,0,0.7)] flex-shrink-0 bg-[#0A0A0E]">
      <Image src={photo.url} alt={photo.alt} width={560} height={480} className="h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
    </div>
  );
};

const PlatformCard: React.FC<{ platform: PlatformRating }> = ({ platform }) => {
  const [animateNumber, setAnimateNumber] = useState(false);
  const percentage = (platform.rating / platform.maxRating) * 100;

  useEffect(() => {
    let t: number | undefined;
    if (animateNumber) {
      t = window.setTimeout(() => setAnimateNumber(false), 1000);
    }
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [animateNumber]);

  const normalizedStars =
    platform.maxRating === 10
      ? Math.round((platform.rating / platform.maxRating) * 5)
      : Math.round(platform.rating);

  return (
    <div
      className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] glass-panel rounded-2xl border border-white/10 p-5 flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex-shrink-0"
      onMouseEnter={() => setAnimateNumber(true)}
      onTouchStart={() => setAnimateNumber(true)}
    >
      <div className="relative mb-2 h-[68px] w-[78px]">
        <Image
          src={platform.logo}
          alt={`${platform.name} logo`}
          fill
          sizes="78px"
          className="object-contain transition-transform duration-300"
        />
      </div>
      <h3 className="text-xs md:text-sm font-display font-bold uppercase tracking-[0.1em] text-white mb-1">
        {platform.name}
      </h3>
      <div className="flex items-baseline gap-1 mb-2 font-mono">
        <span
          className="text-lg md:text-2xl font-bold transition-transform"
          style={{
            color: platform.color,
            transform: animateNumber ? 'scale(1.5)' : 'scale(1)',
            transition: 'transform 300ms ease',
          }}
        >
          {platform.rating}
        </span>
        <span className="text-xs md:text-sm text-white/55">/{platform.maxRating}</span>
      </div>
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < normalizedStars ? 'fill-[#E01E5A] text-[#E01E5A]' : 'text-gray-600'}
          />
        ))}
      </div>
      <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${percentage}%`, backgroundColor: platform.color }}
        />
      </div>
    </div>
  );
};

const CountCard: React.FC<{ count: RatingCount }> = ({ count }) => {
  const [animateNumber, setAnimateNumber] = useState(false);
  useEffect(() => {
    let t: number | undefined;
    if (animateNumber) t = window.setTimeout(() => setAnimateNumber(false), 1000);
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [animateNumber]);

  return (
    <div
      className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] glass-panel rounded-2xl border border-white/10 p-5 flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex-shrink-0"
      style={{ backgroundColor: count.bgColor }}
      onMouseEnter={() => setAnimateNumber(true)}
      onTouchStart={() => setAnimateNumber(true)}
    >
      <div className="relative mb-2 flex items-center justify-center" style={{ width: 150, height: 90 }}>
        <div
          style={{
            position: 'absolute',
            width: 84,
            height: 84,
            backgroundColor: count.color,
            opacity: 0.18,
            transform: 'translateY(-6px)',
          }}
        />
        <div className="relative h-[72px] w-24" style={{ zIndex: 2 }}>
          <Image
            src={count.logo}
            alt={`${count.platform} logo`}
            fill
            sizes="96px"
            className="object-contain transition-transform duration-300"
          />
        </div>
      </div>

      <div
        className="text-2xl md:text-3xl font-mono font-bold transition-transform duration-200"
        style={{
          color: count.color,
          transform: animateNumber ? 'scale(1.5)' : 'scale(1)',
          textShadow: '0 10px 28px rgba(0,0,0,0.12)',
          transition: 'transform 300ms ease',
        }}
      >
        {count.countLabel}
      </div>
      <div className="text-[10px] font-mono font-bold tracking-[0.15em] text-[#A0A0A0] mt-1 uppercase">
        REVIEWS
      </div>
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

  const effectiveDuration = isTouch ? mobileDuration ?? duration : duration;
  const animationName = direction === 'right' ? 'scroll-right' : 'scroll-left';
  const phaseOffsetSeconds = -(rowIndex * (effectiveDuration / 3));

  return (
    <div
      className="relative w-full overflow-hidden py-1"
      data-row-id={rowIndex}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!expandedRef.current) setIsPaused(false);
      }}
    >
      <div
        className="flex gap-2 md:gap-4"
        style={{
          animation: `${animationName} ${effectiveDuration}s linear infinite`,
          animationPlayState: isPaused ? 'paused' : 'running',
          width: 'max-content',
          animationDelay: `${phaseOffsetSeconds}s`,
        }}
      >
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

  const row1 = buildPatternedRowFixedPlatform(photosRow1, REVIEWS, platformRow1, countRow1, 0, ROW_LENGTH);
  const row2 = buildPatternedRowFixedPlatform(photosRow2, REVIEWS, platformRow2, countRow2, 1, ROW_LENGTH);
  const row3 = buildPatternedRowFixedPlatform(photosRow3, REVIEWS, platformRow3, countRow3, 2, ROW_LENGTH);

  return (
    <section className="overflow-hidden bg-[#000000] border-t border-white/10 py-24 sm:py-32">
      <div className="mx-auto w-[95vw] max-w-[1400px] px-1 md:px-3">
        <div className="text-center mb-14 px-4">
          <p className="text-[11px] font-mono font-medium uppercase tracking-wider text-[#2FBC81] mb-3">
            VOICES OF VIBEHOUSE
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-white font-display">
            Guests keep talking. We keep hosting.
          </h2>
        </div>

        <div className="space-y-4">
          <InfiniteScrollRow items={row1} direction="left" duration={70} mobileDuration={70} rowIndex={0} />
          <InfiniteScrollRow items={row2} direction="right" duration={80} mobileDuration={70} rowIndex={1} />
          <InfiniteScrollRow items={row3} direction="left" duration={70} mobileDuration={70} rowIndex={2} />
        </div>
      </div>

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #E01E5A; }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: #E01E5A transparent; }
        .clamped { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .unclamped { max-height: 110px; overflow: auto; }
        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes scroll-right { 0% { transform: translateX(-33.333%); } 100% { transform: translateX(0); } }
      `}</style>
    </section>
  );
}
