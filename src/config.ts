export const WS_PORT = 3000;

export const WRITING_PHASE_DURATION = 60;   // in seconds
export const VOTING_PHASE_DURATION = 30;    // in seconds
export const PHASE_END_LEEWAY_DURATION = 3; // add a few seconds at the end of each phase for requests to arrive

export const POINTS_PER_VOTE = 100;     // for other people voting for your answer
export const POINTS_PER_CORRECT_GUESS = 200;    // for guessing the correct answer