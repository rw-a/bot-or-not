import { GamePhases } from "./server/types";

export const WS_PORT = 3000;

export const NUMBER_ROUNDS_PER_GAME = 3;

// in seconds. will break if time is one hour or more (same with below)
export const PHASE_DURATIONS = {
    [GamePhases.Writing]: 60,
    [GamePhases.Voting]: 30,
    [GamePhases.VotingResults]: 10,
};
export const PHASE_END_LEEWAY_DURATION = 3; // add a few seconds at the end of each phase for requests to arrive

export const POINTS_PER_VOTE = 100;     // for other people voting for your answer
export const POINTS_PER_CORRECT_GUESS = 200;    // for guessing the correct answer