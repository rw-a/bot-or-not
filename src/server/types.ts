export interface ServerToClientEvents {
  loginCallback: (success: boolean, errorMessage?: string) => void
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

export interface UserData {
  username: string
  ready: boolean
  answer: string
  votes: number
  vote: string
}

export type UserDataMap = Map<keyof UserData, string | boolean | number>;