import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file located at project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });