import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Divider,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import LobbyGame from "./LobbyGame";
import socket from "../socket";

interface Room {
  host: string;
  player_count: number;
  status: string;
}

interface Player {
  id: string;
  name: string;
}

interface GameSettings {
  responseTime: number;
  maxPlayers: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
}

interface PlayerJoinedData {
  players: { sid: string; name: string }[];
  host: { id: string; name: string };
  settings: GameSettings;
  selected_quiz: Quiz | null;
  is_owner: boolean;
}

interface RoomCreatedData {
  room_id: string;
  host: { id: string; name: string };
}

const Lobby = () => {
  const [username, setUsername] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [host, setHost] = useState<Player>({ id: "", name: "" });
  const [settings, setSettings] = useState<GameSettings>({
    responseTime: 15,
    maxPlayers: 4,
  });
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("room_created", (data: RoomCreatedData) => {
      console.log("room_created - données complètes:", data);
      console.log("room_created - host:", data.host);
      console.log("room_created - socket.id:", socket.id);

      setCurrentRoom(data.room_id);
      setIsOwner(true);
      setHost(data.host);
      setPlayers([{ id: socket.id, name: username }]);
      navigate(`/lobby/${data.room_id}`);
    });

    socket.on("player_joined_room", (data: PlayerJoinedData) => {
      setPlayers(
        data.players.map((p) => ({
          id: p.sid,
          name: p.name,
        }))
      );
      setHost(data.host);
      setIsOwner(data.is_owner);
      setSettings(data.settings);

      console.log("État après player_joined_room:");
      console.log("- players:", data.players);
      console.log("- host:", data.host);
      console.log("- isOwner:", data.is_owner);
      console.log("- settings:", data.settings);

      navigate(`/lobby/${currentRoom}`);
    });

    socket.on("player_left_room", (data: PlayerJoinedData) => {
      console.log("player_left_room", data);
      setPlayers(
        data.players.map((p) => ({
          id: p.sid,
          name: p.name,
        }))
      );
      setHost(data.host);
      setIsOwner(socket.id === data.host.id);
    });

    socket.on("rooms_list", (roomsList: Record<string, Room>) => {
      setRooms(roomsList);
    });

    socket.on("room_full", () => {
      alert("La room est pleine");
    });

    socket.on("room_not_found", () => {
      alert("Room non trouvée");
    });

    socket.on("game_started", () => {
      console.log("game_started", isOwner);
      // setTimeout(() => {
      //   if (!isOwner) {
      //     navigate(`/quiz/${currentRoom}`);
      //   } else {
      //     navigate(`/quiz/host/${currentRoom}`);
      //   }
      // }, 10000);
    });

    socket.emit("get_rooms");

    return () => {
      socket.off("room_created");
      socket.off("player_joined_room");
      socket.off("player_left_room");
      socket.off("rooms_list");
      socket.off("room_full");
      socket.off("room_not_found");
      socket.off("game_started");
    };
  }, [navigate, username, currentRoom]);

  const handleJoinGame = () => {
    if (!username || !gameCode) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    socket.emit("join_room", {
      room_id: gameCode,
      player_name: username,
    });
    setCurrentRoom(gameCode);
  };

  const handleCreateGame = () => {
    if (!username) {
      alert("Veuillez entrer votre nom d'utilisateur");
      return;
    }
    socket.emit("create_room", {
      player_name: username,
    });
  };

  const handleRefreshRooms = () => {
    socket.emit("get_rooms");
  };

  const handleKickPlayer = (playerId: string) => {
    if (currentRoom) {
      socket.emit("kick_player", {
        room_id: currentRoom,
        player_id: playerId,
      });
    }
  };

  const handleUpdateSettings = (newSettings: GameSettings) => {
    if (currentRoom) {
      socket.emit("update_settings", {
        room_id: currentRoom,
        settings: newSettings,
      });
      setSettings(newSettings);
    }
  };

  if (currentRoom) {
    console.log("Rendu de LobbyGame avec les props:");
    console.log("- isOwner:", isOwner);
    console.log("- host:", host);
    console.log("- players:", players);
    console.log("- roomId:", currentRoom);

    if (!host.id || !host.name) {
      console.log("Attente de l'initialisation des états...");
      return null;
    }

    return (
      <LobbyGame
        isOwner={isOwner}
        players={players}
        host={host}
        roomId={currentRoom}
        onKickPlayer={handleKickPlayer}
        onUpdateSettings={handleUpdateSettings}
        onGameStart={() => {}}
      />
    );
  }

  return (
    <Container
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 800 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
              Lobby
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Entrez votre nom d'utilisateur"
              />

              <TextField
                label="Code de la partie"
                variant="outlined"
                fullWidth
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                placeholder="Entrez le code de la partie"
              />

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleJoinGame}
                size="large"
              >
                Rejoindre la partie
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  ou
                </Typography>
              </Divider>

              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleCreateGame}
                size="large"
              >
                Créer une partie
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">Parties disponibles</Typography>
              <Button
                onClick={handleRefreshRooms}
                variant="outlined"
                size="small"
              >
                Rafraîchir
              </Button>
            </Box>
            <List>
              {Object.entries(rooms).map(([roomId, room]) => (
                <ListItem key={roomId} divider>
                  <ListItemText
                    primary={`Partie de ${room.host}`}
                    secondary={`${room.player_count}/4 joueurs`}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setGameCode(roomId);
                        handleJoinGame();
                      }}
                      disabled={room.player_count >= 4}
                    >
                      Rejoindre
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {Object.keys(rooms).length === 0 && (
                <ListItem>
                  <ListItemText primary="Aucune partie disponible" />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Lobby;
