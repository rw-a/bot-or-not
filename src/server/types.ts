export interface ServerToClientEvents {
  loginError: (errorMessage: string) => void
  loginSuccess: () => void
  syncGameState: (gameState: GameState) => void
}
  
export interface ClientToServerEvents {
  generateRoomID: (callback: (roomID: string) => void) => void
  create: (roomID: string, userID: string, username: string) => void
  join: (roomID: string, userID: string, username: string) => void
}

export interface InterServerEvents {
  
}

export interface SocketData {

}

// As stored on the server
export interface UserData {
  username: string
  ready: boolean
  votes: number
  answer?: string
  vote?: string
}

export const PUBLIC_USER_DATA = ["username", "ready", "votes"] as const;
export type PublicUserDataProperties = typeof PUBLIC_USER_DATA[number];

export type PublicUserData = Pick<UserData, PublicUserDataProperties>;  // a subset of UserData accessible to the clients

export interface RoomData {
  [key: string]: UserData
}

// As accessible to the clients. UserID and some properties have been removed
export type GameState = PublicUserData[];