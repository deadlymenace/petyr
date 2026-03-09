import 'dotenv/config';
import { startServer } from './server.js';

const port = parseInt(process.env.PETYR_WEB_PORT || '3000', 10);

startServer(port);
