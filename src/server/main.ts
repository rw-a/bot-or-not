import http from 'http';
import express from 'express';
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server);

/*
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
}); */

io.on('connection', (socket) => {
  console.log('A user connected', socket);
});

ViteExpress.listen(app, 3000, () => {
  console.log("Server is listening...")
});