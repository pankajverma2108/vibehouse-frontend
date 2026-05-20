// Debug API call with current setup
async function debugAPI() {
  console.log('🔍 Debugging API configuration...');
  
  // Test environment variables
  const hotelCode = '55402'; // Fallback for testing
  const authCode = '40230910707e9e1bd2-7813-11f0-9'; // Fallback for testing
  
  // Generate dates
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const fromDate = today.toISOString().split('T')[0];
  const toDate = tomorrow.toISOString().split('T')[0];
  
  console.log('📅 Dates:', { fromDate, toDate });
  console.log('🔑 Credentials:', { hotelCode, authCode: authCode ? 'SET' : 'MISSING' });
  
  const API_CONFIG = {
    url: 'https://live.ipms247.com/pmsinterface/getdataAPI.php',
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

  console.log('🌐 Full URL:', `${API_CONFIG.url}?${API_CONFIG.params}`);
  console.log('📦 Request Body:', API_CONFIG.body);
  
  try {
    const response = await fetch(`${API_CONFIG.url}?${API_CONFIG.params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Cookie': 'AWSALB=Y5HkTnOzVdgLcExchylok+8yb5N76C06ZAiE',
      },
      body: API_CONFIG.body
    });

    console.log('✅ Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);
    
  } catch (error) {
    console.error('❌ Fetch Error:', error);
    console.log('🔍 Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

debugAPI();