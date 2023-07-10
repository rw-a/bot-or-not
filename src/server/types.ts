export interface ServerToClientEvents {
    
  }
  
export interface ClientToServerEvents {
  join: (roomID: string, userID: string, username: string) => void;
  create: (roomID: string, userID: string, username: string) => void;
}

export interface InterServerEvents {
  
}

export interface SocketData {
  roomID: string,
  userID: string,
  username: string,
  create: boolean
}