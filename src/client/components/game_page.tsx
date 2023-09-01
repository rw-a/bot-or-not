import { FormEventHandler } from 'react';
import { Button } from './components';
import { GameState, GamePhases, UserID, RoomID, UserData } from '../../server/types';
import { GAME_PHASE_NAMES, LLM_INGAME_NAME, POINTS_PER_CORRECT_GUESS, POINTS_PER_VOTE } from '../../config';

import IMG_READY from '../assets/ready.png';
import IMG_UNREADY from '../assets/waiting.png';

interface GamePageProps {
  gameState: GameState
  roomID: RoomID
  userID: UserID
  minutes: number
  seconds: number
  answer: string
  submittedAnswer: string
  vote: UserID
  submittedVote: UserID
  onReady: () => void
  onLeave: () => void
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
  onVoteChange: (userID: UserID) => void
  submitVote: () => void
}

export function GamePage({ 
  gameState, roomID, userID, minutes, seconds, 
  answer, submittedAnswer, vote, submittedVote, 
  onReady, onLeave, onAnswerChange, submitAnswer, onVoteChange, submitVote }: GamePageProps) {

  return (
    <div className="flex flex-col border-solid border-[1px] rounded-md
      border-slate-700  dark:border-neutral-200">
      <TopBar 
        gameState={gameState} 
        roomID={roomID} 
        userID={userID} 
        minutes={minutes} 
        seconds={seconds} 
        onReady={onReady} 
        onLeave={onLeave}
        className="flex justify-between"
      />
      <div className="flex">
        <SidePanel gameState={gameState} className="basis-1/4"/>
        <MainPanel 
          gameState={gameState}
          userID={userID}
          answer={answer}
          submittedAnswer={submittedAnswer}
          vote={vote}
          submittedVote={submittedVote}
          onAnswerChange={onAnswerChange}
          submitAnswer={submitAnswer}
          onVoteChange={onVoteChange}
          submitVote={submitVote}
          className="basis-3/4 flex border-0 border-t-[1px] border-l-[1px]"
        />
      </div>
    </div>
  );
}

interface TopBarProps {
  gameState: GameState
  roomID: string
  userID: string
  minutes: number
  seconds: number
  onReady: () => void
  onLeave: () => void
  className?: string
}

function TopBar({gameState, roomID, userID, minutes, seconds, onReady, onLeave, className}: TopBarProps) {
  /* TODO
  Will need to add property in room data that tracks whether user is active or not (also update disconnected sessions to reflect this)
  Ready button should change color based on user's ready state
  */
  const userReady = gameState.users[userID].ready;

  return (
    <div className={className}>
      {gameState.gamePhase === GamePhases.Lobby || gameState.gamePhase === GamePhases.End ? <>
        <Button onClick={onLeave}>Leave</Button>
      </> : <>
      <p>Time Remaining: {minutes * 60 + seconds}</p>
      </>}

      {gameState.gamePhase === GamePhases.Lobby ? <>
        <Button onClick={onReady}>{(userReady) ? "Unready" : "Ready"}</Button>
        <p>Room Code: {roomID}</p>
      </> : <>
        <p>{GAME_PHASE_NAMES[gameState.gamePhase]}</p>
        <p>Round: {gameState.round}</p>
      </>}
    </div>
  );
}

interface SidePanelProps {
  gameState: GameState
  className?: string
}

function SidePanel({gameState, className}: SidePanelProps) {
  /* TODO
  Only show ready state in Lobby Phase
  */
  return (
    <div className={className}>
        {Object.entries(gameState.users).map(([userID, user]) =>
          <div key={userID} className={"flex justify-between items-center border-t-[1px] px-1"}>
            <div>
              <p>{user.username}</p>
              <p>Points: {user.points}</p>
            </div>
            <div>
              <img src={user.ready ? IMG_READY: IMG_UNREADY} className="h-8 w-8"></img>
            </div>
          </div>
        )}
    </div>
  );
}

interface MainPanelProps {
  gameState: GameState
  userID: UserID
  answer: string
  submittedAnswer: string
  vote: UserID
  submittedVote: UserID
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
  onVoteChange: (userID: UserID) => void
  submitVote: () => void
  className?: string
}

function MainPanel({
  gameState, userID, answer, submittedAnswer, vote, submittedVote, 
  onAnswerChange, submitAnswer, onVoteChange, submitVote, className}: MainPanelProps) {

  return (
    <div className={className}>
      {gameState.gamePhase === GamePhases.Lobby ? <>
        {Object.keys(gameState.users).length < 2 ? 
        "Waiting for more players to join..."
        : "Waiting for players to ready up..."}
      </> : (gameState.gamePhase === GamePhases.Writing) ? <>
        <MainPanelWriting 
          gameState={gameState} 
          answer={answer} 
          submittedAnswer={submittedAnswer} 
          onAnswerChange={onAnswerChange} 
          submitAnswer={submitAnswer}
        ></MainPanelWriting>
      </> : (gameState.gamePhase === GamePhases.VotingResults) ? <>
        <MainPanelVotingResults gameState={gameState}></MainPanelVotingResults>
      </> : (gameState.gamePhase === GamePhases.Voting) ? <>
       <MainPanelVoting 
        gameState={gameState} 
        userID={userID}
        vote={vote} 
        submittedVote={submittedVote}
        onVoteChange={onVoteChange}
        submitVote={submitVote}
       ></MainPanelVoting>
      </> : <>
        <MainPanelGameDone gameState={gameState}></MainPanelGameDone>
      </>}
    </div>
  );
}

interface MainPanelWritingProps {
  gameState: GameState
  answer: string
  submittedAnswer: string
  onAnswerChange: FormEventHandler<HTMLTextAreaElement>
  submitAnswer: () => void
}

function MainPanelWriting({gameState, answer, submittedAnswer, onAnswerChange, submitAnswer}: MainPanelWritingProps) {
  const answerSaved = answer === submittedAnswer;

  return (
    <div className="flex flex-col basis-full justify-between">
    <div>
      Prompt: {gameState.rounds[gameState.round].prompt}
    </div>
    <div className="flex border-[1px] w-full">
      <textarea value={answer} onInput={onAnswerChange} className="w-full resize-none"></textarea>
      <button 
        onClick={submitAnswer} 
        disabled={answerSaved}
        className={`border-[1px] border-${(answerSaved) ? "muted" : "success"} ${answerSaved ? "text-muted" : ""}`}
       >{(submittedAnswer) ? "Resubmit" : "Submit"}</button>
    </div>
  </div>
  );
}

interface MainPanelVoting {
  gameState: GameState
  userID: UserID
  vote: UserID
  submittedVote: UserID
  onVoteChange: (userID: UserID) => void
  submitVote: () => void
}

function MainPanelVoting({gameState, userID: thisUserID, vote, submittedVote, onVoteChange, submitVote}: MainPanelVoting) {
  /* Maybe use grid instead */
  /* TODO
  */
  return (
  <div className="basis-full flex flex-col justify-between">
    <div className="flex flex-row flex-wrap justify-around">
      {Object.entries(gameState.users).map(([userID, user]) => 
      (thisUserID !== userID) ? 
      <div 
      key={userID} 
      className={"cursor-pointer hover:bg-muted border-[1px]" 
      + (submittedVote === userID ? " border-success" : "") 
      + (vote === userID ? " bg-muted": "")} 
      onClick={() => {onVoteChange(userID)}}>
        <p>User: {user.username}</p>
        <p>Response: {user.answers[gameState.round]}</p>
      </div>
      : "")}
      <div 
      className={"cursor-pointer hover:bg-muted border-[1px]" 
      + (submittedVote === gameState.llmUserID ? " border-success" : "") 
      + (vote === gameState.llmUserID ? " bg-muted": "")} 
      onClick={() => {onVoteChange(gameState.llmUserID)}}>
        <p>User: LLM</p>
        <p>Response: {gameState.rounds[gameState.round].llmResponse}</p>
      </div>
    </div>
    <div className="flex flex-row justify-center">
      <Button disabled={submittedVote === vote && Boolean(submittedVote)} onClick={submitVote}>{submittedVote !== vote && submittedVote ? "Change Vote" : "Submit Vote"}</Button>
    </div>
  </div>
  );
}

interface MainPanelVotingResults {
  gameState: GameState
}

function MainPanelVotingResults({gameState}: MainPanelVotingResults) {
  const votingResults = [];
  for (const [userID, user] of Object.entries(gameState.users)) {
    const votedUserID = user.votes[gameState.round];
    let votedUsername: string;
    let pointsGainingUsername: string;
    let numPointsGained: typeof POINTS_PER_CORRECT_GUESS | typeof POINTS_PER_VOTE;

    if (votedUserID === gameState.llmUserID) {
      votedUsername = LLM_INGAME_NAME;
      pointsGainingUsername = user.username;
      numPointsGained = POINTS_PER_CORRECT_GUESS;
    } else {
      const votedUserID = user.votes[gameState.round];
      const votedUser = gameState.users[votedUserID]
      votedUsername = votedUser.username;
      pointsGainingUsername = votedUser.username;
      numPointsGained = POINTS_PER_VOTE;
    }

    votingResults.push(
      <div key={userID}>
        <p><span className="font-medium">{user.username}</span> voted for <span className="font-medium">{votedUsername}.</span></p>
        <p><span className="font-medium">{pointsGainingUsername}</span> gained <span className="font-medium">{numPointsGained}</span> points.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {...votingResults}
    </div>
  );
}

interface MainPanelGameDone {
  gameState: GameState
}

function MainPanelGameDone({gameState}: MainPanelGameDone) {
  /* TODO
  Create a top 3 winners. Currently only person(s) with top score wins.
  */

  // Finds the person with the highest score OR persons if tied
  let winners: UserData[] = [];
  for (const user of Object.values(gameState.users)) {
    if (winners.length === 0 || user.points === winners[0].points) {
      winners.push(user);
    } else if (user.points > winners[0].points) {
      winners = [user];
    }
  }

  return (
    <div>
      {winners.map((user) => 
      <p key={user.username}>{user.username} won!</p>
      )}
    </div>
  );
}