import crypto from "crypto";
import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, RoomData, PUBLIC_USER_DATA, UserData } from "./types";
import { WS_PORT } from "../config";


/* Setup Server */
dotenv.config();

const app = express();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${process.env.SERVER_PORT}`
  }
});
io.listen(WS_PORT);

const DATABASE: {
  [key:string]: RoomData
} = {};


/* Helper Functions */
function generateID(len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}

function syncGameState(roomID: string) {
  const gameState: RoomData = {};
  for (const [userID, userData] of Object.entries(DATABASE[roomID])) {
    const publicUserData: Partial<UserData> = {};
    for (const userProperty of PUBLIC_USER_DATA) {
      publicUserData[userProperty] = userData[userProperty];
    }
    gameState[userID] = publicUserData;
  }
  io.to(roomID).emit("syncGameState", gameState);
}


/* Socket Handling */
io.on("connect", (socket) => {
  socket.on("generateRoomID", (callback: (roomID: string) => void) => {
    // Generate roomID until an unonccupied one is found
    let roomID: string;
    do {
      roomID = generateID(6).toUpperCase();
    } while (DATABASE.hasOwnProperty(roomID));

    callback(roomID);
  });

  socket.on("create", (roomID: string, userID: string, username: string) => {
    if (DATABASE.hasOwnProperty(roomID)) {
      // This shouldn't happen since room code is checked on generation
      socket.emit("loginError", "Room already exists.");
      return;
    }

    DATABASE[roomID] = {
      [userID]: {
        username: username,
        ready: false,
        votes: 0
      }
    };

    socket.join(roomID);
    socket.emit("loginSuccess");
    syncGameState(roomID);
  });

  socket.on("join", (roomID: string, userID: string, username: string) => {
    if (!DATABASE.hasOwnProperty(roomID)) {
      socket.emit("loginError", "Room doesn't exist.");
      return;
    }

    const roomData = DATABASE[roomID];
    const otherUsernames = []; 
    for (const user of Object.values(roomData)) {
      otherUsernames.push(user.username);
    }

    roomData[userID] = {
      username: username,
      ready: false,
      votes: 0
    };

    socket.join(roomID);
    socket.emit("loginSuccess");
    syncGameState(roomID);
  });

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});


ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});