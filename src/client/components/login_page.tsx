import { socket } from '../socket';
import { useEffect, useRef, useState } from 'react';
import { ButtonTyper, TextInput } from './components';
import { LoginError } from '../../server/types';
import TextScrambler from './text_scrambler';

interface LoginPageProps {
  onLogin: (roomCode: string, newUsername: string, create: boolean) => void
  loginError: LoginError
}

export function LoginPage({ onLogin, loginError }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [roomID, setRoomID] = useState("");

  // Tracks whether the user has tried to submit the login
  const [triedLogin, setTriedLogin] = useState(false);  // login = join OR create room
  const [triedJoin, setTriedJoin] = useState(false);

  const titleRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) {
      const textScrambler = new TextScrambler(titleRef.current);
      textScrambler.setText("bot-or-not");
    }
  }, []);

  function handleUsernameChange(event: React.FormEvent<HTMLInputElement>) {
    setUsername(event.currentTarget.value);
  }

  function handleRoomIDChange(event: React.FormEvent<HTMLInputElement>) {
    setRoomID(event.currentTarget.value);
  }

  function handleJoin() {
    if (!username) {
      setTriedLogin(true);
      setTriedJoin(true);
      return;
    }

    onLogin(roomID, username, false);
  }

  async function handleCreate() {
    if (!username) {
      setTriedLogin(true);
      return;
    }

    const roomID: string = await socket.emitWithAck("generateRoomID");
    onLogin(roomID, username, true);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 ref={titleRef} className="text-2xl font-bold">‎</h1>
      <div>
        <p className="text-lg font-medium">username</p>
        <TextInput
          required
          value={username}
          placeholder='enter your username...'
          onChange={handleUsernameChange}
          verify={triedLogin}
          errorText={(loginError.errorType === "username") ? loginError.errorMessage : ""}
        ></TextInput>
      </div>
      <div className="flex justify-around items-center">
        <div className="w-full">
          <p className="text-lg font-medium">room_code</p>
          <TextInput
            required
            value={roomID}
            placeholder='enter a room code...'
            onChange={handleRoomIDChange}
            verify={Boolean(loginError.errorMessage) || triedJoin}
            errorText={(loginError.errorType === "room") ? loginError.errorMessage : ""}
          ></TextInput>
          <ButtonTyper onClick={handleJoin}>join-room</ButtonTyper>
        </div>
        <div className="w-full flex justify-center">
          <ButtonTyper onClick={handleCreate}>create-room</ButtonTyper>
        </div>
      </div>
    </div>
  );
}