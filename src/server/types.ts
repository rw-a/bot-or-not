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
  votes: number
  answer?: string
  vote?: string
}