// API service to fetch room prices
export interface RoomPrice {
  roomTypeId: string;
  price: number;
  priceWithTax: number;
  taxRate: number;
}

// Calculate tax based on room price
export const calculateTax = (basePrice: number): { priceWithTax: number; taxRate: number } => {
  const taxRate = basePrice >= 7500 ? 18 : 5;
  const priceWithTax = parseFloat((basePrice * (1 + taxRate / 100)).toFixed(2));
  return { priceWithTax, taxRate };
};

export const fetchRoomPrices = async (): Promise<RoomPrice[]> => {
  // Generate current date and tomorrow's date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const fromDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  const toDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format

  // Get credentials from environment variables with fallback
  const hotelCode = import.meta.env.VITE_HOTEL_CODE || '55402';
  const authCode = import.meta.env.VITE_AUTH_CODE || '40230910707e9e1bd2-7813-11f0-9';
  
  if (!hotelCode || !authCode) {
    console.warn('⚠️ Environment variables missing, using fallback values');
  }

  const API_CONFIG = {
    url: 'https://api.buteak.in/api/prices',//'https://api.buteak.in/api/prices', // https://hotel-api-prices.onrender.com/api/prices http://3.111.32.236:3001/api/prices
    params: new URLSearchParams({
      Request_Type: '-',
      HotelCode: hotelCode,
      AuthCode: authCode,
      FromDate: fromDate,
      ToDate: toDate
    }),
    body: `<RES_Request>
   <Request_Type>Rate</Request_Type>
   <Authentication>
      <HotelCode>${hotelCode}</HotelCode>
      <AuthCode>${authCode}</AuthCode>
   </Authentication>
   <FromDate>${fromDate}</FromDate>
   <ToDate>${toDate}</ToDate>
</RES_Request>`
  };

  try {
    console.log('🔄 Making API call with dates:', { fromDate, toDate });
    console.log('🔑 Using credentials:', { hotelCode, authCode: authCode ? 'SET' : 'MISSING' });
    console.log('🌐 API URL:', API_CONFIG.url);
    console.log('📋 Request Body:', API_CONFIG.body);
    console.log('🔗 Full URL with params:', `${API_CONFIG.url}?${API_CONFIG.params}`);
    
    const response = await fetch(`${API_CONFIG.url}?${API_CONFIG.params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: API_CONFIG.body
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('📄 Raw API Response:', xmlText.substring(0, 1000) + '...');
    
    // Log if the response contains the dates we sent
    if (xmlText.includes(fromDate) && xmlText.includes(toDate)) {
      console.log('✅ API response contains our custom dates');
    } else {
      console.log('❌ API response does not contain our custom dates');
      console.log('Expected fromDate:', fromDate, 'toDate:', toDate);
    }
    
    // Parse XML to extract prices from the second source
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Get all sources and log them for debugging
    const sources = xmlDoc.querySelectorAll('Source');
    console.log('🔍 Found sources:', Array.from(sources).map(s => s.getAttribute('name')));
    
    // Get the second source (https://buteak.in/ - WEB)
    const webSource = Array.from(sources).find(source => 
      source.getAttribute('name')?.includes('buteak.in')
    );
    
    if (!webSource) {
      throw new Error('Web source not found in API response');
    }
    
    // Extract room prices from the web source
    const rateTypes = webSource.querySelectorAll('RateType');
    const prices: RoomPrice[] = [];
    
    rateTypes.forEach(rateType => {
      const roomTypeId = rateType.querySelector('RoomTypeID')?.textContent;
      const basePrice = rateType.querySelector('Base')?.textContent;
      
      if (roomTypeId && basePrice) {
        const price = parseFloat(parseFloat(basePrice).toFixed(2));
        const { priceWithTax, taxRate } = calculateTax(price);
        prices.push({
          roomTypeId,
          price,
          priceWithTax,
          taxRate
        });
      }
    });
    
    console.log('✅ Successfully fetched', prices.length, 'room prices from API');
    return prices;
  } catch (error) {
    console.error('❌ Error fetching room prices:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    console.log('🚫 API failed - no room cards will be displayed');
    // Return empty array if API fails - no fallback prices
    return [];
  }
};

// Map room type IDs to room IDs
export const mapRoomTypeToRoomId = (roomTypeId: string): string => {
  const mapping: { [key: string]: string } = {
    '5540200000000000001': 'medium-suite',
    '5540200000000000002': 'large-suite'
  };
  return mapping[roomTypeId] || '';
};