// Modern fetch-based API test
async function testAPI() {
  const API_CONFIG = {
    url: 'https://live.ipms247.com/pmsinterface/getdataAPI.php',
    params: new URLSearchParams({
      Request_Type: '-',
      HotelCode: '55402',
      AuthCode: '40230910707e9e1bd2-7813-11f0-9',
      FromDate: '2025-11-01',
      ToDate: '2025-11-02'
    }),
    body: `<RES_Request>
   <Request_Type>Rate</Request_Type>
   <Authentication>
      <HotelCode>55402</HotelCode>
      <AuthCode>40230910707e9e1bd2-7813-11f0-9</AuthCode>
   </Authentication>
   <FromDate>2025-11-01</FromDate>
   <ToDate>2025-11-02</ToDate>
</RES_Request>`
  };

  const fullUrl = `${API_CONFIG.url}?${API_CONFIG.params}`;
  
  console.log('🚀 Testing API...');
  console.log('URL:', fullUrl);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Cookie': 'AWSALB=Y5HkTnOzVdgLcExchylok+8yb5N76C06ZAiE',
        'User-Agent': 'Node.js API Test'
      },
      body: API_CONFIG.body
    });

    console.log('\n✅ Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    
    console.log('\n📄 Response Body:');
    console.log('='.repeat(50));
    console.log(responseText);
    console.log('='.repeat(50));
    
    if (response.ok) {
      console.log('\n🎉 API call successful!');
    } else {
      console.log('\n❌ API call failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('\n❌ Error making API call:', error.message);
  }
}

// Run the test
testAPI();