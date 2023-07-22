/* Socket Events */
export interface ServerToClientEvents {
  // Built-in events
  disconnect: () => void
  connect_error: (error: Error) => void

  // Custom events
  loginError: (errorType: LoginErrorType, errorMessage: string) => void
  loginSuccess: (sessionID: string) => void
  syncGameState: (gameState: GameState) => void
}
  
export interface ClientToServerEvents {
  generateRoomID: (callback: (roomID: string) => void) => void
  createRoom: (roomID: string, userID: string, username: string) => void
  joinRoom: (roomID: string, userID: string, username: string) => void
  restoreSession: (sessionID: string, callback: (sessionInfo: SessionInfo) => void) => void
  toggleReady: () => void
  submitAnswer: (answer: string) => void
  submitVote: (votedUserID: string) => void
}

export interface InterServerEvents {
  
}

export interface SocketData {

}

/* General */
export interface SessionProperties {
  userID: string
  roomID: string
}

export interface SessionInfo {
  roomID: string, 
  userID: string, 
  gameState: GameState
}

export type LoginErrorType = "room" | "username";
export interface LoginError {
  errorType: LoginErrorType
  errorMessage: string
}

/* Stored Server-side */
export enum GamePhases {
  Lobby,
  Writing,
  Voting,
  End
}

export interface RoomData {
  gamePhase: GamePhases
  timerStartTime: Date   // WARNING: this gets converted into string form when sent over socket.io
  prompt?: string
  round: number
  users: {
    [key: string]: UserData
  }
}

export interface UserData {
  username: string
  ready: boolean
  points: number
  answer?: string
  vote?: string
}

/* Accessible client-side. A subset of the data stored server-side */
export const PUBLIC_USER_DATA = ["username", "ready", "points"] as const;
type PublicUserDataProperties = typeof PUBLIC_USER_DATA[number];
export type PublicUserData = Pick<UserData, PublicUserDataProperties>; // UserID and some properties have been removed

export interface GameState extends Omit<RoomData, 'users'> {
  users: {
    [key: string]: PublicUserData
  }
};