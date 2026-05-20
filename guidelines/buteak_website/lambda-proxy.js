export const handler = async (event) => {
    const { queryStringParameters, body } = event;
    
    const apiUrl = 'https://live.ipms247.com/pmsinterface/getdataAPI.php';
    const params = new URLSearchParams(queryStringParameters);
    
    try {
        const response = await fetch(`${apiUrl}?${params}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml',
            },
            body: body
        });
        
        const data = await response.text();
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://buteak.in',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'text/xml'
            },
            body: data
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': 'https://buteak.in',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};