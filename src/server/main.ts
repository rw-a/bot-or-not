import express from "express";
import { Server } from "socket.io";
import ViteExpress from "vite-express";
import dotenv from "dotenv";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, 
  RoomData, PUBLIC_USER_DATA, GameState, PublicUserData, UserData, GamePhases } from "./types";
import { WS_PORT, WRITING_PHASE_DURATION, VOTING_PHASE_DURATION, POINTS_PER_VOTE, PHASE_END_LEEWAY_DURATION } from "../config";
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
      // @ts-ignore
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
      // Create room with initial game state
      DATABASE[roomID] = {gamePhase: GamePhases.Lobby, timerStartTime: new Date(), users: {}};
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

    /* TODO
    Check that the room is currently in lobby phase
    */

    DATABASE[roomID].users[userID] = createUser(username);

    socket.join(roomID);
    syncGameState(roomID);
    socket.emit("loginSuccess");
  });

  socket.on("toggleReady", (roomID: string, userID: string) => {
    if (DATABASE.hasOwnProperty(roomID) && DATABASE[roomID].users.hasOwnProperty(userID)) {
      DATABASE[roomID].users[userID].ready = !DATABASE[roomID].users[userID].ready;
      
      // If all players are now ready, start writing phase
      if (DATABASE[roomID].users[userID].ready && allPlayersReady(roomID)) {
        DATABASE[roomID].gamePhase = GamePhases.Writing;
        DATABASE[roomID].timerStartTime = new Date();

        setTimeout(() => {
          // Once writing phase finishes, start voting phase
          DATABASE[roomID].gamePhase = GamePhases.Voting;
          DATABASE[roomID].timerStartTime = new Date();
          syncGameState(roomID);

          setTimeout(() => {
            // Once voting phase finishes
            
            /* TODO 
            Finish game or loop back to writing then voting
            Probably want to make the start writing phase and start voting phase into functions
            */
            
            /* TODO
            Rather than adding a leeway, automatically move on once all users have sent their request
            */
          }, (VOTING_PHASE_DURATION + PHASE_END_LEEWAY_DURATION) * 1000);

        }, (WRITING_PHASE_DURATION + PHASE_END_LEEWAY_DURATION) * 1000);
      }
      
      syncGameState(roomID);
    }
  });

  socket.on("submitAnswer", (roomID: string, userID: string, answer: string) => {
    if (DATABASE[roomID].gamePhase !== GamePhases.Writing) return;
    DATABASE[roomID].users[userID].answer = answer;
  }); 

  socket.on("submitVote", (roomID: string, userID: string, userIndex: number) => {
    /* TODO
    this doesn't consider the fact that you can vote for the AI
    May need to change index into first 10 characters of userID
    */
    if (DATABASE[roomID].gamePhase !== GamePhases.Voting) return;
    const votedUserID = Object.keys(DATABASE[roomID].users)[userIndex];
    const votedUser = DATABASE[roomID].users[votedUserID];
    votedUser.points += POINTS_PER_VOTE;
    DATABASE[roomID].users[userID].vote = votedUser.username;
  }); 

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});


ViteExpress.listen(app, Number(process.env.SERVER_PORT), () => {
  console.log(`Starting server on port ${process.env.SERVER_PORT}...`)
});