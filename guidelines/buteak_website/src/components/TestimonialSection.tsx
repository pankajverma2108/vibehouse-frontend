import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { count } from 'console';

// ==================== Interfaces ====================
interface Review {
  text: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  source: 'Booking.com' | 'MakeMyTrip' | 'Google';
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

// ==================== Config & Assets ====================
const GOOGLE_BUSINESS_URL = 'https://share.google/BY9FHLPFuJaA2TvGq';

const PLATFORM_LOGOS = {
  Google: '/images/Google_Logo.png',
  Booking: '/images/Booking_Logo.png',
  MMT: '/images/MMT_Logo.png'
};

// ==================== Data ====================
const REVIEWS: Review[] = [
  // Booking
  { text: "Outstanding experience! We had an exceptionally pleasant stay at this property. The staff were warm, professional, and always ready to assist. On one occasion when we were in real need, Rahul and Nisha went above and beyond to support us in a very critical and sensitive matter — we cannot thank them enough for their kindness. The service throughout was efficient and thoughtful, and the food exceeded expectations in both quality and variety. Overall, it was a comfortable and memorable stay, and I would gladly return in the future.", author: 'Nitesh', location: 'United States', rating: 10, date: 'Sep 21, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "Feels like secure and the environment was awesome. No disturbance at all..staff also was supportive and documentation process is also so simple. Everything is awesome. No dislikes..", author: 'T', location: 'India', rating: 10, date: 'Sep 2, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "Buteak Suites exceeded my expectations. The room was stylish and very comfortable, perfect for a work trip. Daily housekeeping, a functional kitchen, and access to Cult Fit gym made it feel like home. The staff was always available and quick to assist. Security and cleanliness were top-notch. Would definitely stay again!", author: 'Sawlani', location: 'India', rating: 10, date: 'Jul 4, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "I had a wonderful stay at Buteak Suites. The suite was clean, spacious, and thoughtfully designed, with a cozy living area and a fully equipped kitchen. The staff was incredibly helpful and polite. I especially appreciated the breakfast delivery at my chosen time — a really nice touch! The location in BTM Layout is central and well-connected. Highly recommended for both short and long stays.", author: 'Mirani', location: 'India', rating: 10, date: 'Jul 4, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "Spacious stay, comfortable, neat, and a perfect choice for long duration stays.", author: 'Vishal', location: 'India', rating: 10, date: 'Jun 22, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "The property is very comfy. Felt like home.", author: 'Saswat', location: 'India', rating: 10, date: 'May 29, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "My stay was so comfortable and amazing. Host Nisha is very friendly. Staff is professional and very helpful. Breakfast was served hot and tasty. Property is well maintained and located in the perfect location. Overall I had a very good time staying in Buteak Suites.", author: 'Anonymous', location: 'India', rating: 10, date: 'Jul 17, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },
  { text: "Great location, cozy vibes, and everything was thoughtfully arranged. Perfect for a short or long term stay, place was hygienic , staff was polite and services was quick. Overall everything was good.", author: 'Anonymous', location: 'India', rating: 10, date: 'May 27, 2025', source: 'Booking.com', link: 'https://www.booking.com/hotel/in/buteak-suites-btm-layout.html' },

  // MakeMyTrip
  { text: "I had a fantastic stay! The location is convenient and right in the heart of the city. The service was warm and professional, and the staff was always helpful.", author: 'Nikunj M.', location: 'India', rating: 5, date: 'Jul 2025', source: 'MakeMyTrip', link: 'https://www.makemytrip.com/hotels/buteak_suites-details-bangalore.html' },
  { text: "Large, tastefully furnished rooms with upscale upholstery gave a premium feel. The suite kitchen had everything I needed. Reception and staff were wonderfully attentive. Charming little library corner.", author: 'Himanshu J.', location: 'India', rating: 5, date: 'Jul 2025', source: 'MakeMyTrip', link: 'https://www.makemytrip.com/hotels/buteak_suites-details-bangalore.html' },
  { text: "Absolutely loved the airy, generously sized rooms at Buteak Suites. Each one features tasteful premium upholstery and a fully functional kitchen. The reception team was welcoming and attentive, and the simple breakfast offerings were delightful. Spotlessly clean throughout!", author: 'Neha M.', location: 'India', rating: 5, date: 'Jul 2025', source: 'MakeMyTrip', link: 'https://www.makemytrip.com/hotels/buteak_suites-details-bangalore.html' },

  // Google reviews
  { text: "Lovely place the people are very nice, it super clean, at a great location. There is a lack of restaurant but you order anything to staff and it comes in a moment like a restaurant. Mr Rahul manager always helped. Loved the stay.", author: 'Prashansu Pathak', location: 'India', rating: 5, date: 'a week ago', source: 'Google', link: GOOGLE_BUSINESS_URL },
  { text: "Had a wonderful stay at Buteak Suites! The rooms were clean, comfortable, and nicely designed. The staff were friendly and helpful throughout. Great location and peaceful atmosphere — definitely recommended for a pleasant stay.", author: 'Vidya Shree', location: 'India', rating: 5, date: '4 days ago', source: 'Google', link: GOOGLE_BUSINESS_URL },
  { text: "Super central area. Very clean and tidy. Very helpful host. Top-notch hospitality. Cozy lobby and book corner.", author: 'Preeti Gupta', location: 'India', rating: 5, date: '3 months ago', source: 'Google', link: GOOGLE_BUSINESS_URL },
  { text: "Great spot in the city. Very clean and tidy. Attentive and kind host. Team goes above and beyond. Warm welcome and nice reading space.", author: 'Ajit Patel', location: 'India', rating: 5, date: '3 months ago', source: 'Google', link: GOOGLE_BUSINESS_URL },
  { text: "Supar central area . Neat and clean property. Welcoming and professional host. Service is impeccable. Warm welcome and nice reading space", author: 'Shubham Agariya', location: 'India', rating: 5, date: '3 months ago', source: 'Google', link: GOOGLE_BUSINESS_URL },
  { text: "Great serviced apartments with beautiful interiors and 24x7 service. Keep up the good work!", author: 'Shiv Hastawala', location: 'India', rating: 5, date: 'a month ago', source: 'Google', link: GOOGLE_BUSINESS_URL },
  { text: "Hygienic bathroom facilities, good communication and support, parking facility available, Value for money", author: 'Yogesh Kumar Yadav', location: 'India', rating: 5, date: '3 months ago', source: 'Google', link: GOOGLE_BUSINESS_URL }
];

const PLATFORM_RATINGS: PlatformRating[] = [
  { name: 'Google', rating: 4.8, maxRating: 5, logo: PLATFORM_LOGOS.Google, color: '#4285F4' },
  { name: 'Booking.com', rating: 9.6, maxRating: 10, logo: PLATFORM_LOGOS.Booking, color: '#003580' },
  { name: 'MakeMyTrip', rating: 4.8, maxRating: 5, logo: PLATFORM_LOGOS.MMT, color: '#E7352B' }
];

const PLATFORM_COUNTS: RatingCount[] = [
  { platform: 'Google', countLabel: '60+', logo: PLATFORM_LOGOS.Google, color: '#34A853', bgColor: '#D9F1E6' },
  { platform: 'Booking.com', countLabel: '20+', logo: PLATFORM_LOGOS.Booking, color: '#003580', bgColor: '#DDEBFF' },
  { platform: 'MakeMyTrip', countLabel: '5+', logo: PLATFORM_LOGOS.MMT, color: '#E7352B', bgColor: '#FFECE6' }
];

const PHOTOS: PhotoCard[] = [
  { url: '/images/career-page-images/hero-image.png', alt: 'hero-image' },
  { url: '/images/career-page-images/own-a-property.png', alt: 'own-a-property' },
  { url: '/images/features-images/24-7-reception.png', alt: '24-7-reception' },
  { url: '/images/features-images/eat-complimentary-breakfast.png', alt: 'eat-complimentary-breakfast' },
  { url: '/images/features-images/fully-equipped-in-room-kitchens-with-complimentary-essentials.png', alt: 'kitchen' },
  { url: '/images/features-images/gym.png', alt: 'gym' },
  { url: '/images/features-images/mob-kitchen.png', alt: 'mob-kitchen' },
  { url: '/images/features-images/spacious-living-areas-for-relaxation-and-productivity.png', alt: 'spacious' },
  { url: '/images/features-images/tailored-cleaning-services-to-your-preferences.png', alt: 'cleaning' },
  { url: '/images/loyalty/buteak-suites-loyalty-card.png', alt: 'loyalty' },
  { url: '/images/career-page-images/customer.jpg', alt: 'customer' },
  { url: '/images/career-page-images/customer2.jpg', alt: 'customer2' },
  { url: '/images/career-page-images/customer3.jpg', alt: 'customer3' },
  { url: '/images/career-page-images/customer4.jpg', alt: 'customer4' },
  { url: '/images/career-page-images/Feed1.jpg', alt: 'feed1' },
  { url: '/images/career-page-images/Feed2.jpg', alt: 'feed2' },
  { url: '/images/career-page-images/Feed3.jpg', alt: 'feed3' },
  { url: '/images/career-page-images/Feed4.jpg', alt: 'feed4' }
];

// ==================== Helpers ====================
function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROW_LENGTH = 18;

// Fixed alternating pattern to avoid adjacent same types
const ALTERNATING_PATTERN: ('review' | 'platform' | 'photo' | 'count')[] = [
  'review','photo','platform','review','photo','count','review','photo','platform','review','photo','count','review','photo','platform','review','photo','count'
];


function buildPatternedRowFixedPlatform(
  photos: PhotoCard[],
  reviews: Review[],
  platformForRow: PlatformRating,
  countForRow: RatingCount,
  length = ROW_LENGTH
) {
  // Filter reviews by platform source
  const platformReviews = reviews.filter(review => {
    if (platformForRow.name === 'Google') return review.source === 'Google';
    if (platformForRow.name === 'Booking.com') return review.source === 'Booking.com';
    if (platformForRow.name === 'MakeMyTrip') return review.source === 'MakeMyTrip';
    return false;
  });
  
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
    } else { // review
      if (reviewPool.length) result[i] = { type: 'review', data: reviewPool.shift()! };
      else if (photoPool.length) result[i] = { type: 'photo', data: photoPool.shift()! };
      else result[i] = { type: 'review', data: platformReviews[(rp++) % platformReviews.length] };
    }
  }

  // safety fill (shouldn't be necessary)
  for (let i = 0; i < length; i++) {
    if (!result[i]) result[i] = { type: 'photo', data: photos[i % photos.length] };
  }

  return result;
}

// ==================== Card components ====================
const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = review.text.length > 180;
  const normalizedRating = review.source === 'Booking.com' ? Math.round((review.rating / 10) * 5) : Math.round(review.rating);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const notifyRow = (expanded: boolean) => {
    try {
      const el = rootRef.current?.closest('[data-row-id]') as HTMLElement | null;
      if (el) {
        const ev = new CustomEvent('review-expand', { detail: { expanded } });
        el.dispatchEvent(ev);
      }
    } catch { /* ignore */ }
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
    setIsExpanded(prev => {
      const next = !prev;
      setTimeout(() => notifyRow(next), 0);
      return next;
    });
  };

  return (
    <div ref={rootRef} className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] bg-white rounded-xl p-3 flex flex-col tile transition-all duration-300 flex-shrink-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <img src={review.source === 'MakeMyTrip' ? PLATFORM_LOGOS.MMT : review.source === 'Booking.com' ? PLATFORM_LOGOS.Booking : PLATFORM_LOGOS.Google} alt="logo" className="w-5 h-5 object-contain" />
          <span className="text-xs text-gray-600 hidden md:block">{review.source}</span>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} className={i < normalizedRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
          ))}
        </div>
      </div>

      <div className={`flex-1 mb-1 overflow-hidden`}>
        <div
          className={`text-xs md:text-sm text-gray-700 leading-relaxed custom-scroll ${isExpanded ? 'unclamped' : 'clamped'}`}
          onWheel={(ev) => ev.stopPropagation()}
        >
          {isExpanded ? review.text : (shouldTruncate ? review.text.slice(0, 160) + '...' : review.text)}
        </div>
      </div>

      {shouldTruncate && (
        <div className="mb-1">
          <button
            onClick={toggle}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
          >
            {isExpanded ? 'Read less' : 'Read more'}
          </button>
        </div>
      )}

      <div className="mt-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{review.author}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500 truncate">{review.location}</p>
          <p className="text-xs font-medium text-gray-600 truncate">{review.date}</p>
        </div>
      </div>
    </div>
  );
};

const PhotoCardComponent: React.FC<{ photo: PhotoCard; variant?: number }> = ({ photo, variant = 0 }) => {
  return (
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] bg-white rounded-xl overflow-hidden tile transition-all duration-300 flex-shrink-0">
      <img src={photo.url} alt={photo.alt} className="w-full h-full object-cover" />
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
  const normalizedStars = platform.maxRating === 10 ? Math.round((platform.rating / platform.maxRating) * 5) : Math.round(platform.rating);
  return (
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] bg-white rounded-xl p-4 flex flex-col items-center justify-center tile transition-all duration-300 flex-shrink-0" onMouseEnter={() => setAnimateNumber(true)} onTouchStart={() => setAnimateNumber(true)}>
      <img src={platform.logo} alt={`${platform.name} logo`} style={{ width: 78, height: 68, transition: 'transform 300ms ease' }} className="object-contain mb-2" />
      <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1">{platform.name}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-lg md:text-2xl font-bold transition-transform`} style={{ color: platform.color, transform: animateNumber ? 'scale(1.5)' : 'scale(1)', transition: 'transform 300ms ease' }}>{platform.rating}</span>
        <span className="text-sm md:text-xl text-gray-500">/{platform.maxRating}</span>
      </div>
      <div className="flex gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} className={i < normalizedStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
        ))}
      </div>
      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
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
    <div className="w-[160px] h-[210px] md:w-[280px] md:h-[240px] rounded-xl p-4 flex flex-col items-center justify-center tile transition-all duration-300 flex-shrink-0 relative group" style={{ backgroundColor: count.bgColor }} onMouseEnter={() => setAnimateNumber(true)} onTouchStart={() => setAnimateNumber(true)}>
      <div className="relative mb-2 flex items-center justify-center" style={{ width: 160, height: 100 }}>
        <div style={{ position: 'absolute', width: 96, height: 96, borderRadius: 9999, backgroundColor: count.color, opacity: 0.18, transform: 'translateY(-6px)' }} />
        <img src={count.logo} alt={`${count.platform} logo`} className="object-contain" style={{ width: 140, height: 110, transition: 'transform 300ms ease', zIndex: 2 }} />
      </div>

      <div className="text-2xl md:text-3xl font-extrabold transition-transform duration-200" style={{ color: count.color, transform: animateNumber ? 'scale(1.5)' : 'scale(1)', textShadow: '0 10px 28px rgba(0,0,0,0.12)', transition: 'transform 300ms ease' }}>{count.countLabel}</div>
      <div className="text-xs tracking-widest text-gray-500 mt-1">REVIEWS</div>
    </div>
  );
};

// ==================== Infinite Scroll Row ====================
const InfiniteScrollRow: React.FC<{ items: CarouselItem[]; direction: 'left' | 'right'; duration?: number; mobileDuration?: number; rowIndex?: number }> = ({ items, direction, duration = 70, mobileDuration, rowIndex = 0 }) => {
  const duplicated = [...items, ...items, ...items];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const expandedRef = useRef(false);
  const [isTouch, setIsTouch] = useState(false);
  const resumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setIsTouch(typeof navigator !== 'undefined' && (navigator as any).maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail as { expanded: boolean } | undefined;
        if (detail && typeof detail.expanded === 'boolean') {
          expandedRef.current = detail.expanded;
          setIsPaused(detail.expanded);
          if (detail.expanded && resumeTimerRef.current) {
            window.clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
          }
        }
      } catch { }
    };
    el.addEventListener('review-expand', handler as EventListener);
    return () => el.removeEventListener('review-expand', handler as EventListener);
  }, []);

  // pointer down: pause; on touch devices schedule auto-resume after 3s
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
  const onPointerUp = () => { /* keep existing behavior */ };

  const effectiveDuration = isTouch ? (mobileDuration ?? duration) : duration;
  const animationName = direction === 'right' ? 'scroll-right' : 'scroll-left';

  // offset the animation phase per-row to avoid aligned visible tiles
  const phaseOffsetSeconds = -(rowIndex * (effectiveDuration / 3));

  return (
    <div
      className="relative w-full overflow-hidden py-1"
      data-row-id={rowIndex}
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => { setIsPaused(false); }}
    >
      <div className="flex gap-2 md:gap-4" style={{ animation: `${animationName} ${effectiveDuration}s linear infinite`, animationPlayState: isPaused ? 'paused' : 'running', width: 'max-content', animationDelay: `${phaseOffsetSeconds}s` }}>
        {duplicated.map((item, idx) => {
          const key = `${item.type}-${idx}`;
          if (item.type === 'review') {
            return (
              <a key={key} href={item.data.link} target="_blank" rel="noopener noreferrer" className="inline-block" onClick={(e) => { /* default navigation; Read more prevents navigation */ }}>
                <ReviewCard review={item.data} />
              </a>
            );
          }
          if (item.type === 'photo') {
            const variant = idx % 3;
            return <PhotoCardComponent key={key} photo={item.data} variant={variant} />;
          }
          if (item.type === 'platform') return <PlatformCard key={key} platform={item.data} />;
          return <CountCard key={key} count={item.data} />;
        })}
      </div>
    </div>
  );
};

// ==================== Main Component ====================
const TestimonialSection: React.FC = () => {
  // Dedicated platforms/counts per row
  const platformRow1 = PLATFORM_RATINGS.find(p => p.name === 'Booking.com')!;
  const platformRow2 = PLATFORM_RATINGS.find(p => p.name === 'Google')!;
  const platformRow3 = PLATFORM_RATINGS.find(p => p.name === 'MakeMyTrip')!;

  const countRow1 = PLATFORM_COUNTS.find(c => c.platform === 'Booking.com')!;
  const countRow2 = PLATFORM_COUNTS.find(c => c.platform === 'Google')!;
  const countRow3 = PLATFORM_COUNTS.find(c => c.platform === 'MakeMyTrip')!;

  // Distribute photos uniquely across rows
  const photosPerRow = Math.ceil(PHOTOS.length / 3);
  const photosRow1 = PHOTOS.slice(0, photosPerRow);
  const photosRow2 = PHOTOS.slice(photosPerRow, photosPerRow * 2);
  const photosRow3 = PHOTOS.slice(photosPerRow * 2);

  const row1 = buildPatternedRowFixedPlatform(photosRow1, REVIEWS, platformRow1, countRow1, ROW_LENGTH);
  const row2 = buildPatternedRowFixedPlatform(photosRow2, REVIEWS, platformRow2, countRow2, ROW_LENGTH);
  const row3 = buildPatternedRowFixedPlatform(photosRow3, REVIEWS, platformRow3, countRow3, ROW_LENGTH);

  const ROW_DURATION = 70; //speed for all rows

  return (
    <section className="py-8 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="mx-auto" style={{ width: '90vw', maxWidth: '1200px', padding: '0 1rem' }}>
        <div className="text-center mb-4 px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">Guest Experiences</h2>
          <div className="w-24 h-1 bg-hotel-accent mx-auto mb-3" />
          <p className="text-base text-gray-600 max-w-2xl mx-auto">Discover what our guests have to say about their memorable stays at Buteak Suites</p>
        </div>

        <div className="space-y-1">
          <InfiniteScrollRow items={row1} direction="left" duration={ROW_DURATION} mobileDuration={ROW_DURATION} rowIndex={0} />
          <InfiniteScrollRow items={row2} direction="right" duration={80} mobileDuration={ROW_DURATION} rowIndex={1} />
          <InfiniteScrollRow items={row3} direction="left" duration={ROW_DURATION} mobileDuration={ROW_DURATION} rowIndex={2} />
        </div>
      </div>

      <style>{`
        .tile { box-shadow: 0 8px 20px rgba(0,0,0,0.12); transition: box-shadow 220ms ease; }
        .tile:hover, .tile:active, .tile.group-hover, .tile.group:active { box-shadow: 0 22px 48px rgba(0,0,0,0.22); }

        .custom-scroll::-webkit-scrollbar { width: 1px; height: 1px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; border-radius: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #b8862b, #8f6b1d); border-radius: 999px; box-shadow: inset 0 0 2px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.02); }
        .custom-scroll::-webkit-scrollbar-thumb:hover { box-shadow: inset 0 0 6px rgba(0,0,0,0.18); }
        .custom-scroll { scrollbar-width: thin; scrollbar-color: #b8862b transparent; }

        .clamped { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        .unclamped { max-height: 110px; overflow: auto; }

        @keyframes scroll-left { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        @keyframes scroll-right { 0% { transform: translateX(-33.333%); } 100% { transform: translateX(0); } }
        @media (max-width: 768px) { .testimonial-wrapper { width: 98vw !important; } }
      `}</style>
    </section>
  );
};

export default TestimonialSection;