const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
};

// Mock data for demonstration (in production, this would proxy to Google's API)
const MOCK_MODE = process.env.MOCK_MODE === 'true';

function getMockResponse(requestBody) {
    // Parse the request to see how many apps were requested
    let apps = [];
    try {
        const parsed = JSON.parse(requestBody);
        const requestedApps = parsed.request.app || [];
        
        // Create mock responses for each requested app
        apps = requestedApps.map(app => ({
            appid: app.appid,
            cohortname: "Stable",
            status: "ok",
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
        }));
    } catch (e) {
        // Fallback to single app
        apps = [{
            appid: "{8A69D345-D564-463C-AFF1-A69D9E530F96}",
            cohortname: "Stable",
            status: "ok",
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
        }];
    }
    
    const response = {
        response: {
            protocol: "3.1",
            app: apps
        }
    };
    
    // Return with safe JSON prefix (includes newline)
    return ')]}\'\n' + JSON.stringify(response);
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

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    if (MOCK_MODE) {
        console.log('Running in MOCK mode - using sample data');
    }
});
