import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const PLAN_FILE = path.join(DATA_DIR, 'plan.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = Number.parseInt(process.env.PORT || '3000', 10);

const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

async function ensurePlanFile() {
  try {
    await fs.access(PLAN_FILE);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await writePlanFile([]);
  }
}

async function readPlanFile() {
  await ensurePlanFile();
  const raw = await fs.readFile(PLAN_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

async function writePlanFile(items) {
  await fs.writeFile(PLAN_FILE, JSON.stringify({ items }, null, 2), 'utf8');
}

async function loadActivities() {
  const raw = await fs.readFile(ACTIVITIES_FILE, 'utf8');
  return JSON.parse(raw);
}

function normalizePlanItem(data) {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: data.title?.trim(),
    startTime: data.startTime ?? null,
    endTime: data.endTime ?? null,
    location: data.location?.trim() || '',
    notes: data.notes?.trim() || '',
    createdAt: now,
    updatedAt: now,
    status: 'scheduled'
  };
}

function validatePlanPayload(body, { partial = false } = {}) {
  if (!partial) {
    if (!body.title || typeof body.title !== 'string') {
      return 'A title is required to create a plan item.';
    }
    if (!body.startTime || typeof body.startTime !== 'string') {
      return 'A start time is required to create a plan item.';
    }
  }
  const allowed = new Set(['title', 'startTime', 'endTime', 'location', 'notes', 'status']);
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      return `Invalid property provided: ${key}`;
    }
  }
  if (body.status && !['scheduled', 'completed', 'cancelled'].includes(body.status)) {
    return 'Status must be scheduled, completed, or cancelled.';
  }
  return null;
}

function pseudoWeather(lat, lon) {
  const base = Math.abs(Math.sin(lat) + Math.cos(lon));
  const temperatureC = 8 + base * 14 + (lat > 0 ? 6 : 0);
  const conditionBuckets = ['Clear skies', 'Partly cloudy', 'Overcast', 'Light rain', 'Windy'];
  const condition = conditionBuckets[Math.floor(base * 10) % conditionBuckets.length];
  const humidity = Math.round(35 + base * 55);
  const windKph = Math.round(5 + base * 20);
  return {
    temperature: Math.round((temperatureC * 9) / 5 + 32),
    unit: 'F',
    condition,
    humidity,
    windKph
  };
}

function timeSegmentFromHour(hour) {
  if (hour < 6) return 'late-night';
  if (hour < 10) return 'morning';
  if (hour < 12) return 'late-morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function scoreActivity(activity, { interests, timeOfDay, weather }) {
  let score = 0;
  if (interests.length) {
    const intersection = activity.tags.filter((tag) => interests.includes(tag));
    score += intersection.length * 3;
  }
  if (activity.bestFor?.includes(timeOfDay)) {
    score += 4;
  }
  if (weather) {
    const weatherTag = weather.condition.toLowerCase();
    if (weatherTag.includes('rain') && activity.bestFor?.includes('rain')) {
      score += 2;
    }
    if (weatherTag.includes('clear') && activity.tags.includes('outdoors')) {
      score += 1;
    }
    if (weatherTag.includes('wind') && activity.tags.includes('outdoors')) {
      score -= 1;
    }
  }
  score += Math.max(0, 4 - (activity.duration || 60) / 60);
  return score;
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    ...DEFAULT_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { error: message });
}

async function handlePlanCollection(req, res) {
  if (req.method === 'GET') {
    const items = await readPlanFile();
    items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    sendJSON(res, 200, { items });
    return true;
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.message);
      return true;
    }

    const error = validatePlanPayload(body);
    if (error) {
      sendError(res, 400, error);
      return true;
    }

    const items = await readPlanFile();
    const newItem = normalizePlanItem(body);
    items.push(newItem);
    await writePlanFile(items);
    sendJSON(res, 201, { item: newItem });
    return true;
  }

  return false;
}

async function handlePlanItem(req, res, id) {
  const items = await readPlanFile();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) {
    sendError(res, 404, 'Plan item not found.');
    return true;
  }

  if (req.method === 'PATCH') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      sendError(res, 400, error.message);
      return true;
    }

    const validationError = validatePlanPayload(body, { partial: true });
    if (validationError) {
      sendError(res, 400, validationError);
      return true;
    }

    const updated = {
      ...items[index],
      ...body,
      updatedAt: new Date().toISOString()
    };
    items[index] = updated;
    await writePlanFile(items);
    sendJSON(res, 200, { item: updated });
    return true;
  }

  if (req.method === 'DELETE') {
    items.splice(index, 1);
    await writePlanFile(items);
    res.writeHead(204, DEFAULT_HEADERS);
    res.end();
    return true;
  }

  return false;
}

async function handleWeather(req, res, url) {
  const lat = Number.parseFloat(url.searchParams.get('lat'));
  const lon = Number.parseFloat(url.searchParams.get('lon'));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    sendError(res, 400, 'Latitude and longitude are required.');
    return true;
  }
  const weather = pseudoWeather(lat, lon);
  const hour = new Date().getUTCHours();
  sendJSON(res, 200, { weather, timeOfDay: timeSegmentFromHour(hour) });
  return true;
}

async function handleRecommendations(req, res, url) {
  const lat = Number.parseFloat(url.searchParams.get('lat'));
  const lon = Number.parseFloat(url.searchParams.get('lon'));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    sendError(res, 400, 'Latitude and longitude are required.');
    return true;
  }

  const interests = (url.searchParams.get('interests') || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const weather = pseudoWeather(lat, lon);
  const activitiesData = await loadActivities();
  const sortedCities = activitiesData
    .map((city) => ({
      ...city,
      distance: distanceKm(lat, lon, city.coordinates.lat, city.coordinates.lon)
    }))
    .sort((a, b) => a.distance - b.distance);

  const topCity = sortedCities[0];
  if (!topCity) {
    sendJSON(res, 200, { city: null, distance: null, timeOfDay: null, weather, activities: [] });
    return true;
  }

  const timeZone = topCity.timezones?.[0] || 'UTC';
  const hour = Number.parseInt(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone
    }).format(new Date()),
    10
  );
  const timeOfDay = timeSegmentFromHour(hour);

  const activities = topCity.activities
    .map((activity) => ({
      ...activity,
      city: topCity.city,
      score: scoreActivity(activity, { interests, timeOfDay, weather })
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  sendJSON(res, 200, {
    city: topCity.city,
    distance: Number(topCity.distance.toFixed(1)),
    timeOfDay,
    weather,
    activities
  });
  return true;
}

async function serveStaticFile(res, relativePath) {
  try {
    const safePath = path.normalize(relativePath).replace(/^([.][/\\])+/, '');
    const absolutePath = path.join(PUBLIC_DIR, safePath);
    if (!absolutePath.startsWith(PUBLIC_DIR)) {
      sendError(res, 403, 'Forbidden');
      return true;
    }

    const stat = await fs.stat(absolutePath);
    if (stat.isDirectory()) {
      return serveStaticFile(res, path.join(relativePath, 'index.html'));
    }

    const ext = path.extname(absolutePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await fs.readFile(absolutePath);

    res.writeHead(200, {
      ...DEFAULT_HEADERS,
      'Content-Type': contentType,
      'Content-Length': content.length
    });
    res.end(content);
    return true;
  } catch (error) {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, DEFAULT_HEADERS);
    res.end();
    return;
  }

  try {
    if (url.pathname === '/api/plan') {
      if (await handlePlanCollection(req, res)) return;
      res.writeHead(405, DEFAULT_HEADERS);
      res.end();
      return;
    }

    if (url.pathname.startsWith('/api/plan/')) {
      const id = decodeURIComponent(url.pathname.replace('/api/plan/', ''));
      if (await handlePlanItem(req, res, id)) return;
      res.writeHead(405, DEFAULT_HEADERS);
      res.end();
      return;
    }

    if (url.pathname === '/api/weather') {
      if (await handleWeather(req, res, url)) return;
    }

    if (url.pathname === '/api/recommendations') {
      if (await handleRecommendations(req, res, url)) return;
    }

    if (req.method === 'GET') {
      const relativePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (await serveStaticFile(res, relativePath)) {
        return;
      }
      // Fallback to SPA index for unknown assets
      if (await serveStaticFile(res, 'index.html')) {
        return;
      }
    }

    sendError(res, 404, 'Not found');
  } catch (error) {
    console.error('Server error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`Planner server listening on port ${PORT}`);
});
