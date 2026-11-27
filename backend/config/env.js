import dotenv from 'dotenv'

// set development and production switch later
dotenv.config({ path: `.env` });

export const {
    PORT,
    DB_URI,
    ADMIN_KEY,
    JWT_SECRET, JWT_EXPIRES_IN
} = process.env;

