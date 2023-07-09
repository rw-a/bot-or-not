import http from 'http';
import express from 'express';
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";
import { WS_PORT } from '../config';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${process.env.SERVER_PORT}`
  }
});
io.listen(WS_PORT);

/*
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
}); */

io.on('connection', (socket) => {
  console.log('A user connected', socket.data);
  socket.emit("foo", "Hi");
});

ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});