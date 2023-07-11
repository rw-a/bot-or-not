export interface ServerToClientEvents {
  loginError: (errorMessage: string) => void
  loginSuccess: () => void
  syncGameState: (roomData: RoomData) => void
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

export interface RoomData {
  [key: string]: UserData
}