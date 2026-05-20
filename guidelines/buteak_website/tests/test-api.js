const https = require('https');
const querystring = require('querystring');

// API configuration
const API_CONFIG = {
  url: 'https://live.ipms247.com/pmsinterface/getdataAPI.php',
  params: {
    Request_Type: '-',
    HotelCode: '55402',
    AuthCode: '40230910707e9e1bd2-7813-11f0-9',
    FromDate: '2025-11-01',
    ToDate: '2025-11-02'
  },
  headers: {
    'Content-Type': 'application/xml',
    'Cookie': 'AWSALB=Y5HkTnOzVdgLcExchylok+8yb5N76C06ZAiE',
    'User-Agent': 'Node.js API Test'
  },
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

function testAPI() {
  console.log('🚀 Testing API...');
  console.log('URL:', API_CONFIG.url + '?' + querystring.stringify(API_CONFIG.params));
  
  const urlWithParams = API_CONFIG.url + '?' + querystring.stringify(API_CONFIG.params);
  const url = new URL(urlWithParams);
  
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      ...API_CONFIG.headers,
      'Content-Length': Buffer.byteLength(API_CONFIG.body)
    }
  };

  const req = https.request(options, (res) => {
    console.log('\n✅ Response Status:', res.statusCode);
    console.log('📋 Response Headers:', res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n📄 Response Body:');
      console.log('='.repeat(50));
      console.log(data);
      console.log('='.repeat(50));
      
      if (res.statusCode === 200) {
        console.log('\n🎉 API call successful!');
      } else {
        console.log('\n❌ API call failed with status:', res.statusCode);
      }
    });
  });

  req.on('error', (error) => {
    console.error('\n❌ Error making API call:', error.message);
  });

  req.write(API_CONFIG.body);
  req.end();
}

// Run the test
testAPI();