import { UserData } from "./types";
import QUESTIONS from "./llm/questions.json";

export function generateID(len?: number) {
  var arr = new Uint8Array((len || 40) / 2)
  crypto.getRandomValues(arr)
  return Array.from(arr, (dec) => dec.toString(16).padStart(2, "0")).join('')
}
  
export function createUser(username: string): UserData {
  return {
      username: username,
      ready: false,
      points: 0,
  };
}

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

export function getPrompt() {
  const index = getRandomInt(0, QUESTIONS.length);
  return QUESTIONS[index];
}