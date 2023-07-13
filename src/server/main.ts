import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, 
  RoomData, PUBLIC_USER_DATA, GameState, PublicUserData, UserData } from "./types";
import { WS_PORT } from "../config";
import { generateID, createUser } from "./utility";


/* Setup Server */
dotenv.config();

const app = express();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>({
  cors: {
    origin: `http://localhost:${process.env.SERVER_PORT}`
  }
});
io.listen(WS_PORT);

const DATABASE: {[key:string]: RoomData} = {};


function syncGameState(roomID: string) {
  const gameState = {} as GameState;
  for (const [key, value] of Object.entries(DATABASE[roomID])) {
    if (key == "users") {
      const users: PublicUserData[] = [];

      for (const userData of Object.values(value as {[key: string]: UserData})) {
        const publicUserData = {} as PublicUserData;
        for (const userProperty of PUBLIC_USER_DATA) {
          // @ts-ignore Typescript goes crazy because we are constructing PublicUserData from nothing
          publicUserData[userProperty] = userData[userProperty];
        }
        users.push(publicUserData);
      }
      
      gameState.users = users;

    } else {
      gameState[key as keyof RoomData] = value;
    }
  }

  io.to(roomID).emit("syncGameState", gameState);
}

function allPlayersReady(roomID: string) {
  for (const user of Object.values(DATABASE[roomID].users)) {
    if (!user.ready) {
      return false;
    }
  }
  return true;
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

  socket.on("createRoom", (roomID: string, userID: string, username: string) => {
    if (DATABASE.hasOwnProperty(roomID)) {
      // This shouldn't happen since room code is checked on generation
      socket.emit("loginError", "Room already exists.");
      return;
    } else {
      DATABASE[roomID] = {hasStarted: false, gameStartTime: new Date(), users: {}};
    }

    DATABASE[roomID].users = {[userID]: createUser(username)};

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");
  });

  socket.on("joinRoom", (roomID: string, userID: string, username: string) => {
    if (!DATABASE.hasOwnProperty(roomID)) {
      socket.emit("loginError", "Room doesn't exist.");
      return;
    }

    DATABASE[roomID].users[userID] = createUser(username);

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");
  });

  socket.on("toggleReady", (roomID: string, userID: string) => {
    if (DATABASE.hasOwnProperty(roomID) && DATABASE[roomID].users.hasOwnProperty(userID)) {
      DATABASE[roomID].users[userID].ready = !DATABASE[roomID].users[userID].ready;
      
      // If all players are now ready, start game
      if (DATABASE[roomID].users[userID].ready && allPlayersReady(roomID)) {
        DATABASE[roomID].hasStarted = true;
        DATABASE[roomID].gameStartTime = new Date();
      }
      
      syncGameState(roomID);
    }
  });

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});


ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});