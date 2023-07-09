import http from 'http';
import express from 'express';
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";

const SERVER_PORT = 5173;

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${SERVER_PORT}`
  }
});
io.listen(3000);

/*
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
}); */

io.on('connection', (socket) => {
  console.log('A user connected', socket.data);
  socket.emit("foo", "Hi");
});

ViteExpress.listen(app, SERVER_PORT, () => {
  console.log(`Starting server on port ${SERVER_PORT}...`)
});