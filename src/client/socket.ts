import { io } from 'socket.io-client';
import { WS_PORT } from '../config';

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === 'production' ? undefined : `http://localhost:${WS_PORT}`;

export const socket = io(URL, {
    autoConnect: false
});