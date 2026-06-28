const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI is missing. Copy .env.example to .env first.');
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        mongoose.set('strictQuery', true);
        cached.promise = mongoose.connect(uri).then((mongoose) => {
            console.log('[pawpal-api] connected to MongoDB');
            return mongoose;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

module.exports = { connectDB };
