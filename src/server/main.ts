import crypto from "crypto";
import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, UserDataMap } from "./types";
import { WS_PORT } from "../config";

function generateID(len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}

dotenv.config();

const app = express();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${process.env.SERVER_PORT}`
  }
});
io.listen(WS_PORT);

const DATABASE = new Map<string, Map<string, UserDataMap>>();

io.on("connect", (socket) => {
  socket.on("generateRoomID", (callback: (roomID: string) => void) => {
    // Generate roomID until an unonccupied one is found
    let roomID;
    do {
      roomID = generateID(6).toUpperCase();
    } while (DATABASE.has(roomID))

    callback(roomID);
  });

  socket.on("create", (roomID: string, userID: string, username: string) => {
    if (DATABASE.has(roomID)) {
      // This shouldn't happen since room code is checked on generation
      socket.emit("loginCallback", false, "Room already exists.");
      return;
    }
    
    const userData: UserDataMap = new Map();
    userData.set("username", username);

    const roomData = new Map<string, UserDataMap>();
    roomData.set(userID, userData);

    DATABASE.set(roomID, roomData);
  });

  socket.on("join", (roomID: string, userID: string, username: string) => {
    if (!DATABASE.has(roomID)) {
      socket.emit("loginCallback", false, "Room doesn't exist.");
      return;
    }

    const roomData = DATABASE.get(roomID);

    // finish

  });

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});


ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});