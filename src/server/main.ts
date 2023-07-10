// import http from 'http';
import express from "express";
import session from "express-session";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from "./types";
import { WS_PORT } from '../config';

dotenv.config();

const app = express();
// const server = http.createServer(app);
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


/* Middleware - Authentication */ 
/*
const sessionMiddleware = session({
  secret: "sdhfbvsdhfgskjdgfsjkdhfgwuyert9287364wegrsmbvfm",
  resave: false,
  saveUninitialized: false
});

io.engine.use(sessionMiddleware); */


io.on("connect", (socket) => {
  socket.on("create", (roomID: string, userID: string, username: string) => {
    
  });

  socket.on("join", (roomID: string, userID: string, username: string) => {
    
  });
});


ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});