const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

const allowedOrigins = new Set([
    process.env.CLIENT_ORIGIN,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
].filter(Boolean));

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin) || /^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PawPal API</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 32px; line-height: 1.6; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
        a { color: #0b6b4f; }
    </style>
</head>
<body>
    <h1>PawPal API is running</h1>
    <p>Backend is connected to MongoDB Atlas.</p>
    <ul>
        <li><a href="/health">/health</a></li>
        <li><a href="/api">/api</a></li>
    </ul>
    <p>Use <code>/api/users</code>, <code>/api/pets</code>, <code>/api/bookings</code>, <code>/api/orders</code>.</p>
</body>
</html>`);
});

app.get('/health', (req, res) => {
    res.json({
        ok: true,
        service: 'pawpal-api',
        time: new Date().toISOString()
    });
});

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('[pawpal-api] MongoDB connection error:', error);
        res.status(500).json({ message: 'Database connection failed' });
    }
});

app.use('/api', require('./src/routes'));

// If not in Vercel environment, start the server normally for local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    async function start() {
        await connectDB();
        app.listen(port, () => {
            console.log(`[pawpal-api] listening on http://localhost:${port}`);
        });
    }

    start().catch((error) => {
        console.error('[pawpal-api] failed to start:', error);
        process.exit(1);
    });
}

// Export the app for Vercel Serverless Functions
module.exports = app;
