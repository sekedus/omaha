// Configuration
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'omaha_versions_cache';
const CACHE_TIMESTAMP_KEY = 'omaha_cache_timestamp';

// App data from omaha.ts
const apps = [
    {
        guid: "{8A69D345-D564-463C-AFF1-A69D9E530F96}",
        flavors: [
            {
                tag: "ChromeStable",
                name: "Google Chrome",
                extra: {
                    ap: "x64-stable-statsdef_1",
                }
            }
        ]
    },
    {
        guid: "{8237E44A-0054-442C-B6B6-EA0509993955}",
        flavors: [
            {
                tag: "ChromeBeta",
                name: "Google Chrome Beta",
            }
        ]
    },
    {
        guid: "{401C381F-E0DE-4B85-8BD8-3F3F14FBDA57}",
        flavors: [
            {
                tag: "ChromeDev",
                name: "Google Chrome Dev",
                extra: {
                    ap: "-arch_x64-statsdef_1",
                },
            }
        ]
    },
    {
        guid: "{4EA16AC7-FD5A-47C3-875B-DBF4A2008C20}",
        flavors: [
            {
                tag: "ChromeCanary",
                name: "Google Chrome Canary",
                extra: {
                    cohort: "1:jn:1ojl@0.05",
                    ap: "x64-canary-statsdef_1",
                },
            }
        ]
    },
    {
        guid: "{47B07D71-505D-4665-AFD4-4972A30C6530}",
        flavors: [
            {
                tag: "PlayGames",
                name: "Google Play Games Beta",
                extra: {
                    ap: "beta",
                },
            }
        ]
    },
    {
        guid: "{232066FE-FF4D-4C25-83B4-3F8747CF7E3A}",
        flavors: [
            {
                tag: "NearbyShare",
                name: "Quick Share",
            }
        ]
    },
    {
        guid: "{C601E9A4-03B0-4188-843E-80058BF16EF9}",
        flavors: [
            {
                tag: "GPG_Developer_Emulator_Stable",
                name: "Google Play Games Developer Emulator Stable",
                extra: {
                    ap: "prod",
                },
            },
            {
                tag: "GPG_Developer_Emulator_Beta",
                name: "Google Play Games Developer Emulator Beta",
                extra: {
                    ap: "dogfood",
                },
            }
        ]
    },
];

function defaultBody() {
    return {
        request: {
            "@os": "win",
            "@updater": "updater",
            "acceptformat": "exe",
            "app": [],
            "arch": "x64",
            "dedup": "cr",
            "domainjoined": false,
            "hw": {
                avx: true,
                physmemory: 16,
                sse: true,
                sse2: true,
                sse3: true,
                sse41: true,
                sse42: true,
                ssse3: true,
            },
            "ismachine": 1,
            "os": {
                arch: "x64",
                platform: "win",
                version: "10.0.22622.0",
            },
            "protocol": "3.1",
        },
    };
}

async function updateCheckRequest(body) {
    const resp = await fetch("/api/update", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    
    if (!resp.ok) {
        throw new Error(`POST update2 failed: ${resp.status} ${resp.statusText}`);
    }
    
    const respText = await resp.text();
    return JSON.parse(respText.substring(5)); // remove Safe JSON Prefixes
}

async function fetchAllUpdates() {
    const allResults = [];
    const allResponses = [];
    
    // Ensure that app ids are not duplicated in each request.
    const depth = Math.max(...apps.map(x => x.flavors.length));
    
    for (let i = 0; i < depth; i++) {
        const body = defaultBody();
        const flavors = [];
        
        for (const app of apps) {
            const flavor = app.flavors[i];
            if (!flavor) continue;
            
            flavors.push(flavor);
            body.request.app.push({
                appid: app.guid,
                updatecheck: {},
                version: "0.0.0.0",
                ...flavor.extra,
            });
        }
        
        if (flavors.length === 0) continue;
        
        const response = await updateCheckRequest(body);
        allResponses.push(response);
        
        for (let j = 0; j < flavors.length; j++) {
            const flavor = flavors[j];
            const appResponse = response.response.app[j];
            
            if (appResponse.updatecheck.status !== "ok") {
                console.log(`No update for "${flavor.name}"`);
                continue;
            }
            
            const updatecheck = appResponse.updatecheck;
            const version = updatecheck.manifest.version;
            // Find URL from dl.google.com with exact match to avoid URL injection
            const url = updatecheck.urls.url.find(s => {
                const codebase = s.codebase;
                return codebase === "https://dl.google.com/" || 
                       codebase.startsWith("https://dl.google.com/") && 
                       new URL(codebase).hostname === "dl.google.com";
            }) || updatecheck.urls.url[updatecheck.urls.url.length - 1];
            const pkg = updatecheck.manifest.packages.package[updatecheck.manifest.packages.package.length - 1];
            
            allResults.push({
                name: flavor.name,
                version: version,
                channel: appResponse.cohortname || "N/A",
                downloadUrl: url.codebase + pkg.name,
                size: pkg.size,
                sha256: pkg.hash_sha256,
            });
        }
    }
    
    return { results: allResults, responses: allResponses };
}

function formatBytes(bytes) {
    return (parseInt(bytes) / 1024 ** 2).toFixed(2) + ' MiB';
}

function displayResults(results) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    results.forEach(result => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td data-label="Product">${escapeHtml(result.name)}</td>
            <td data-label="Version"><code>${escapeHtml(result.version)}</code></td>
            <td data-label="Channel">${escapeHtml(result.channel)}</td>
            <td data-label="Download"><a href="${escapeHtml(result.downloadUrl)}" class="download-link" target="_blank">Download</a></td>
            <td data-label="Size">${formatBytes(result.size)}</td>
            <td data-label="SHA256"><code>${escapeHtml(result.sha256)}</code></td>
        `;
    });
    
    document.getElementById('tableContainer').classList.remove('hidden');
    // Show the toggle response button when table is visible
    document.getElementById('toggleResponseBtn').classList.remove('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function displayResponse(responses) {
    const textarea = document.getElementById('responseText');
    textarea.value = JSON.stringify(responses, null, 2);
}

function updateLastUpdateInfo(timestamp) {
    const info = document.getElementById('lastUpdateInfo');
    const date = new Date(timestamp);
    info.textContent = `Last update: ${date.toLocaleString()}`;
    info.classList.remove('hidden');
}

function saveToCache(data) {
    const timestamp = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
    return timestamp;
}

function loadFromCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !timestamp) return null;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    
    if (cacheAge > CACHE_DURATION_MS) {
        // Cache expired - hide table, timestamp, and toggle button
        document.getElementById('tableContainer').classList.add('hidden');
        document.getElementById('lastUpdateInfo').classList.add('hidden');
        document.getElementById('toggleResponseBtn').classList.add('hidden');
        return null;
    }
    
    return {
        data: JSON.parse(cachedData),
        timestamp: parseInt(timestamp)
    };
}

async function fetchData() {
    const fetchBtn = document.getElementById('fetchBtn');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    
    fetchBtn.disabled = true;
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    
    try {
        const { results, responses } = await fetchAllUpdates();
        const data = { results, responses };
        
        const timestamp = saveToCache(data);
        displayResults(results);
        displayResponse(responses);
        updateLastUpdateInfo(timestamp);
        
    } catch (err) {
        console.error('Error fetching data:', err);
        error.textContent = `Error: ${err.message}`;
        error.classList.remove('hidden');
    } finally {
        fetchBtn.disabled = false;
        loading.classList.add('hidden');
    }
}

function toggleResponse() {
    const responseSection = document.getElementById('responseSection');
    const toggleBtn = document.getElementById('toggleResponseBtn');
    
    if (responseSection.classList.contains('hidden')) {
        responseSection.classList.remove('hidden');
        toggleBtn.textContent = 'Hide POST Response';
    } else {
        responseSection.classList.add('hidden');
        toggleBtn.textContent = 'Show POST Response';
    }
}

function copyToClipboard() {
    const textarea = document.getElementById('responseText');
    const copyBtn = document.getElementById('copyBtn');
    
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(textarea.value).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        document.execCommand('copy');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    });
}

function toggleTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        html.setAttribute('data-theme', 'light');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    document.getElementById('fetchBtn').addEventListener('click', fetchData);
    document.getElementById('toggleResponseBtn').addEventListener('click', toggleResponse);
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Try to load from cache
    const cached = loadFromCache();
    if (cached) {
        displayResults(cached.data.results);
        displayResponse(cached.data.responses);
        updateLastUpdateInfo(cached.timestamp);
    }
});
