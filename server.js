const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
};

// Mock data for demonstration (in production, this would proxy to Google's API)
const MOCK_MODE = process.env.MOCK_MODE === 'true';

function getMockResponse(requestBody) {
    try {
        const mockFilePath = path.join(__dirname, 'mock.json');
        const mockData = JSON.parse(fs.readFileSync(mockFilePath, 'utf8'));

        // Parse the request to see which apps were requested
        const parsed = JSON.parse(requestBody);
        const requestedApps = parsed.request.app || [];
        const requestedAppIds = requestedApps.map(a => a.appid);

        // Collect all matching apps from all mock responses, preserving requested order
        const foundApps = [];
        let baseResponse = mockData[0]?.response || {};

        for (const appid of requestedAppIds) {
            for (const mockResponse of mockData) {
                const app = mockResponse.response.app.find(a => a.appid === appid);
                if (app) {
                    foundApps.push(app);
                    break;
                }
            }
        }

        // If no apps found, fallback to first response
        if (foundApps.length === 0) {
            return ')]}\'\n' + JSON.stringify(mockData[0]);
        }

        // Build response with only requested apps
        const response = {
            response: {
                server: baseResponse.server,
                protocol: baseResponse.protocol,
                daystart: baseResponse.daystart,
                app: foundApps
            }
        };
        return ')]}\'\n' + JSON.stringify(response);
    } catch (e) {
        console.error('Error loading mock data:', e);
        // Fallback to a simple response, matching requested appids
        let requestedAppIds = [];
        try {
            const parsed = JSON.parse(requestBody);
            requestedAppIds = (parsed.request.app || []).map(a => a.appid);
        } catch {
            // If requestBody can't be parsed, fallback to single app
            requestedAppIds = ["{8A69D345-D564-463C-AFF1-A69D9E530F96}"];
        }

        const fallbackApp = {
            appid: "{8A69D345-D564-463C-AFF1-A69D9E530F96}",
            status: "ok",
            cohortname: "Stable Installs & Version Pins",
            updatecheck: {
                status: "ok",
                urls: {
                    url: [{
                        codebase: "https://dl.google.com/release2/chrome/ad5a3xxkus553yasirdsiqukwr5a_128.0.6613.120/"
                    }]
                },
                manifest: {
                    version: "128.0.6613.120",
                    packages: {
                        package: [{
                            name: "128.0.6613.120_chrome_installer.exe",
                            required: true,
                            size: "112086904",
                            hash_sha256: "8e8c40ec86f98c71c5330af52bb20f0dcb6391f7931551bc8eb189201605dc34"
                        }]
                    }
                }
            }
        };

        const fallbackResponse = {
            response: {
                protocol: "3.1",
                app: requestedAppIds.map(appid => ({ ...fallbackApp, appid }))
            }
        };
        return ')]}\'\n' + JSON.stringify(fallbackResponse);
    }
}

function proxyRequest(req, res) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        if (MOCK_MODE) {
            // Return mock data for testing
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(getMockResponse(body));
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
                res.writeHead(proxyRes.statusCode, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(data);
            });
        });
        
        proxyReq.on('error', (error) => {
            res.writeHead(500, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: error.message }));
        });
        
        proxyReq.write(body);
        proxyReq.end();
    });
}

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }
    
    // Handle proxy endpoint
    if (req.url === '/api/update' && req.method === 'POST') {
        proxyRequest(req, res);
        return;
    }
    
    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Prevent path traversal attacks
    const resolvedPath = path.resolve(filePath);
    const baseDir = path.resolve('.');
    if (!resolvedPath.startsWith(baseDir)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1>', 'utf-8');
        return;
    }
    
    // Only serve specific file types
    const allowedExtensions = ['.html', '.js', '.css', '.json'];
    const extname = String(path.extname(filePath)).toLowerCase();
    if (!allowedExtensions.includes(extname)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1>', 'utf-8');
        return;
    }
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Export the proxyRequest function for use in Vercel serverless functions
module.exports = { proxyRequest };

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
        if (MOCK_MODE) {
            console.log('Running in MOCK mode - using sample data');
        }
    });
}
