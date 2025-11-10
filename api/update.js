const https = require('https');
const fs = require('fs');
const path = require('path');

// Mock data for demonstration
const MOCK_MODE = process.env.MOCK_MODE === 'true';

function getMockResponse(requestBody) {
    try {
        // Load mock data from mock.json file
        const mockFilePath = path.join(process.cwd(), 'mock.json');
        const mockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));
        
        // Parse the request to see which apps were requested
        const parsed = JSON.parse(requestBody);
        const requestedApps = parsed.request.app || [];
        
        // If a single app was requested, find it in the mock data
        if (requestedApps.length === 1) {
            const requestedAppId = requestedApps[0].appid;
            
            // Find the response containing this app
            for (const mockResponse of mockData) {
                const app = mockResponse.response.app.find(a => a.appid === requestedAppId);
                if (app) {
                    const response = {
                        response: {
                            server: mockResponse.response.server,
                            protocol: mockResponse.response.protocol,
                            daystart: mockResponse.response.daystart,
                            app: [app]
                        }
                    };
                    return ')]}\'\n' + JSON.stringify(response);
                }
            }
        }
        
        // Return the first response (contains all main Chrome apps) for multiple requests
        return ')]}\'\n' + JSON.stringify(mockData[0]);
    } catch (e) {
        console.error('Error loading mock data:', e);
        // Fallback to a simple response
        const fallbackResponse = {
            response: {
                protocol: "3.1",
                app: [{
                    appid: "{8A69D345-D564-463C-AFF1-A69D9E530F96}",
                    status: "ok",
                    cohortname: "Stable",
                    updatecheck: {
                        status: "ok",
                        urls: {
                            url: [{
                                codebase: "https://dl.google.com/chrome/install/"
                            }]
                        },
                        manifest: {
                            version: "131.0.6778.86",
                            packages: {
                                package: [{
                                    name: "installer.exe",
                                    required: true,
                                    size: "149123456",
                                    hash_sha256: "abc123def456789abc123def456789abc123def456789abc123def456789abc1"
                                }]
                            }
                        }
                    }
                }]
            }
        };
        return ')]}\'\n' + JSON.stringify(fallbackResponse);
    }
}

function proxyRequest(body) {
    return new Promise((resolve, reject) => {
        if (MOCK_MODE) {
            // Return mock data for testing
            resolve(getMockResponse(body));
            return;
        }
        
        const options = {
            hostname: 'update.googleapis.com',
            path: '/service/update2/json',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        
        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            
            proxyRes.on('data', chunk => {
                data += chunk;
            });
            
            proxyRes.on('end', () => {
                resolve(data);
            });
        });
        
        proxyReq.on('error', (error) => {
            reject(error);
        });
        
        proxyReq.write(body);
        proxyReq.end();
    });
}

module.exports = async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(200).setHeader('Access-Control-Allow-Origin', '*')
            .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type')
            .end();
        return;
    }
    
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const data = await proxyRequest(body);
        
        res.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Access-Control-Allow-Origin', '*')
            .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type')
            .send(data);
    } catch (error) {
        res.status(500)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Access-Control-Allow-Origin', '*')
            .json({ error: error.message });
    }
};
