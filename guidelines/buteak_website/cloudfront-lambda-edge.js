exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    
    if (request.uri.startsWith('/api/prices')) {
        const querystring = request.querystring;
        const body = request.body.data ? Buffer.from(request.body.data, 'base64').toString() : '';
        
        const apiUrl = `https://live.ipms247.com/pmsinterface/getdataAPI.php?${querystring}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/xml' },
                body: body
            });
            
            const data = await response.text();
            
            return {
                status: '200',
                statusDescription: 'OK',
                headers: {
                    'content-type': [{ key: 'Content-Type', value: 'text/xml' }],
                    'access-control-allow-origin': [{ key: 'Access-Control-Allow-Origin', value: '*' }]
                },
                body: data
            };
        } catch (error) {
            return {
                status: '500',
                statusDescription: 'Internal Server Error',
                body: `Error: ${error.message}`
            };
        }
    }
    
    return request;
};