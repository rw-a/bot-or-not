import { UserData } from "./types";
import QUESTIONS from "./llm/questions.json";
import { IncomingMessage } from "http";
import { getRandomInt } from "../utility";

export function createUser(username: string): UserData {
  return {
      username: username,
      ready: false,
      points: 0,
  };
}

export function getPrompt() {
  const index = getRandomInt(0, QUESTIONS.length);
  return QUESTIONS[index];
}

export function saveSession(req: IncomingMessage, roomID: string, userID: string) {
  // Save the credentials to the session
  req.session.reload((err) => {
    if (err) {
      console.log(err);
    }
    req.session.roomID = roomID;
    req.session.userID = userID;
    req.session.save();
  });
}