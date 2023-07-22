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
  createRoom: (roomID: string, userID: UserID, username: string) => void
  joinRoom: (roomID: string, userID: UserID, username: string) => void
  restoreSession: (sessionID: string, callback: (sessionInfo?: SessionInfo) => void) => void
  toggleReady: () => void
  submitAnswer: (answer: string) => void
  submitVote: (votedUserID: UserID) => void
}

export interface InterServerEvents {
  
}

export interface SocketData {

}

/* General */
export interface SessionProperties {
  roomID: string
  userID: UserID
}

export interface SessionInfo {
  roomID: string, 
  userID: UserID, 
  gameState: GameState
}

export type LoginErrorType = "room" | "username";
export interface LoginError {
  errorType: LoginErrorType
  errorMessage: string
}

/* TODO
Add the VotingResults phase and update front end accordingly */
export enum GamePhases {
  Lobby,
  Writing,
  Voting,
  End
}

export type SessionID = string;
export type RoomID = string;
export type UserID = string;
export type UserName = string;
export type RoundNumber = number;

export interface RoomData {
  gamePhase: GamePhases
  timerStartTime: Date   // WARNING: this gets converted into string form when sent over socket.io
  round: RoundNumber
  rounds: {
    [key: RoundNumber]: RoundData
  }
  users: {
    [key: UserID]: UserData
  }
  llmUserID: UserID
}

export interface RoundData {
  prompt: string
  llmResponse: string
}

export interface UserData {
  username: UserName
  ready: boolean
  points: number
  answers: {
    [key: RoundNumber]: string
  }
  votes: {
    [key: RoundNumber]: UserID
  }
}

export type GameState = RoomData;