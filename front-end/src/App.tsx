import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Lobby from "./pages/Lobby";
import QuizzHost from "./pages/QuizzHost";
import QuizzClient from "./pages/QuizzClient";
import LobbyGame from "./pages/LobbyGame";
import io from "socket.io-client";

// Configuration de l'URL du serveur Socket.IO
export const SOCKET_URL = "http://127.0.0.1:3000";

interface Player {
  id: string;
  name: string;
}

interface GameSettings {
  responseTime: number;
  maxPlayers: number;
}

interface PlayerJoinedData {
  players: Player[];
  host: Player;
}

const LobbyGameWrapper = () => {
  const { roomId } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [host, setHost] = useState<Player>({ id: "", name: "" });
  const [isOwner, setIsOwner] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({
    responseTime: 15,
    maxPlayers: 4,
  });

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socket.on("player_joined_room", (data: PlayerJoinedData) => {
      setPlayers(data.players);
      setHost(data.host);
      setIsOwner(socket.id === data.host.id);
    });

    socket.on("settings_updated", (newSettings: GameSettings) => {
      setSettings(newSettings);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleKickPlayer = (playerId: string) => {
    const socket = io(SOCKET_URL);
    socket.emit("kick_player", { room_id: roomId, player_id: playerId });
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    const socket = io(SOCKET_URL);
    socket.emit("update_settings", { room_id: roomId, settings: newSettings });
  };

  const handleGameStart = (quiz: any, gameSettings: GameSettings) => {
    // Rediriger vers la page du quiz
    window.location.href = `/quiz/${roomId}`;
  };

  return (
    <LobbyGame
      isOwner={isOwner}
      players={players}
      host={host}
      roomId={roomId || ""}
      onKickPlayer={handleKickPlayer}
      onUpdateSettings={handleUpdateSettings}
      onGameStart={handleGameStart}
    />
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/quizz/:roomId" element={<LobbyGameWrapper />} />
        <Route path="/quizz/host/:roomId" element={<LobbyGameWrapper />} />
        <Route path="/quiz/:roomId" element={<QuizzClient />} />
        <Route path="/quiz/host/:roomId" element={<QuizzHost />} />
      </Routes>
    </Router>
  );
}

export default App;
