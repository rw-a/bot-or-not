import { socket } from '../socket';
import { useState } from 'react';
import { Button, TextInput } from './components';
import { LoginError } from '../../server/types';

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
    <div>
      <h1 className="text-2xl font-bold">Title</h1>
      <div>
        <p className="text-lg font-medium">Username</p>
        <TextInput
          required
          value={username}
          placeholder='Enter your name...'
          onChange={handleUsernameChange}
          verify={triedLogin}
          errorText={(loginError.errorType === "username") ? loginError.errorMessage : ""}
        ></TextInput>
      </div>
      <div className="flex justify-around items-center">
        <div>
          <p className="text-lg font-medium">Room Code</p>
          <TextInput
            required
            value={roomID}
            onChange={handleRoomIDChange}
            verify={Boolean(loginError) || triedJoin}
            errorText={(loginError.errorType === "room") ? loginError.errorMessage : ""}
          ></TextInput>
          <Button onClick={handleJoin}>Join Room</Button>
        </div>
        <div>
          <Button onClick={handleCreate}>Create Room</Button>
        </div>
      </div>
    </div>
  );
}