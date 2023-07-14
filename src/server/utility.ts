import { UserData } from "./types";

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