
export interface Room {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  priceModifiers: Record<string, number>;
  image: string;
  gallery: string[];
  amenities: AMENITIES[];
  maxGuests: number;
  rating: number;
  reviews: number;
  idealFor: string;
}

export interface AMENITIES {
  label: string;
  icon: React.ReactNode;
}

