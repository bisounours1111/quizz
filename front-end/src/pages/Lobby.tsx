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
  Fade,
  Slide,
  Zoom,
  Grow,
  Chip,
  Avatar,
  Paper,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import LobbyGame from "./LobbyGame";
import socket from "../socket";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import GroupIcon from "@mui/icons-material/Group";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

interface Room {
  host: string;
  player_count: number;
  status: string;
  settings: GameSettings;
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

// Composants stylisés
const GradientBackground = styled(Box)(({ theme }) => ({
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  minHeight: "100vh",
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"rgba(255,255,255,0.1)\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"rgba(255,255,255,0.1)\"/><circle cx=\"50\" cy=\"10\" r=\"0.5\" fill=\"rgba(255,255,255,0.1)\"/><circle cx=\"10\" cy=\"60\" r=\"0.5\" fill=\"rgba(255,255,255,0.1)\"/><circle cx=\"90\" cy=\"40\" r=\"0.5\" fill=\"rgba(255,255,255,0.1)\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')",
    opacity: 0.3,
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(10px)",
  borderRadius: 16,
  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
  },
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 25,
  textTransform: "none",
  fontSize: "1.1rem",
  fontWeight: "bold",
  padding: "12px 32px",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
  },
}));

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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("room_created", (data: RoomCreatedData) => {
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

      navigate(`/lobby/${currentRoom}`);
    });

    socket.on("player_left_room", (data: PlayerJoinedData) => {
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

  const handleJoinGame = (roomId: string = gameCode) => {
    if (!username || !roomId) {
      setSnackbar({
        open: true,
        message: "Veuillez remplir tous les champs",
        severity: 'error'
      });
      return;
    }
    socket.emit("join_room", {
      room_id: roomId,
      player_name: username,
    });
    setCurrentRoom(roomId);
  };

  const handleCreateGame = () => {
    if (!username) {
      setSnackbar({
        open: true,
        message: "Veuillez entrer votre nom d'utilisateur",
        severity: 'error'
      });
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

  const handleViewChange = (view: "lobby" | "quiz") => {
    if (view === "quiz") {
      if (!isOwner) {
        navigate(`/quiz/${currentRoom}`);
      } else {
        navigate(`/quiz/host/${currentRoom}`);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (currentRoom) {
    if (!host.id || !host.name) {
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
        onViewChange={handleViewChange}
      />
    );
  }

  return (
    <GradientBackground>
      <Container
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 900 }}>
          <Fade in timeout={1000}>
            <Typography 
              variant="h2" 
              component="h1" 
              align="center" 
              gutterBottom
              sx={{
                color: "white",
                fontWeight: "bold",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                mb: 4,
              }}
            >
              🎮 Quiz Game
            </Typography>
          </Fade>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 4 }}>
            {/* Formulaire de connexion */}
            <Slide direction="right" in timeout={1200}>
              <StyledCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography 
                    variant="h4" 
                    component="h2" 
                    align="center" 
                    gutterBottom
                    sx={{ fontWeight: "bold", mb: 3 }}
                  >
                    Rejoindre une partie
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <TextField
                      label="Nom d'utilisateur"
                      variant="outlined"
                      fullWidth
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Entrez votre nom d'utilisateur"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />

                    <TextField
                      label="Code de la partie"
                      variant="outlined"
                      fullWidth
                      value={gameCode}
                      onChange={(e) => setGameCode(e.target.value)}
                      placeholder="Entrez le code de la partie"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                        },
                      }}
                    />

                    <StyledButton
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => handleJoinGame()}
                      size="large"
                      startIcon={<PersonAddIcon />}
                      sx={{
                        background: "linear-gradient(45deg, #2196F3 30%, #1976D2 90%)",
                        "&:hover": {
                          background: "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                        },
                      }}
                    >
                      Rejoindre la partie
                    </StyledButton>

                    <Divider sx={{ my: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        ou
                      </Typography>
                    </Divider>

                    <StyledButton
                      variant="contained"
                      color="success"
                      fullWidth
                      onClick={handleCreateGame}
                      size="large"
                      startIcon={<PlayArrowIcon />}
                      sx={{
                        background: "linear-gradient(45deg, #4CAF50 30%, #45a049 90%)",
                        "&:hover": {
                          background: "linear-gradient(45deg, #45a049 30%, #4CAF50 90%)",
                        },
                      }}
                    >
                      Créer une partie
                    </StyledButton>
                  </Box>
                </CardContent>
              </StyledCard>
            </Slide>

            {/* Liste des parties disponibles */}
            <Slide direction="left" in timeout={1400}>
              <StyledCard>
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                      <GroupIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                      Parties disponibles
                    </Typography>
                    <IconButton
                      onClick={handleRefreshRooms}
                      sx={{
                        background: "rgba(0,0,0,0.05)",
                        "&:hover": {
                          background: "rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                  
                  <Paper sx={{ maxHeight: 400, overflow: "auto" }}>
                    <List>
                      {Object.entries(rooms).map(([roomId, room], index) => (
                        room.status === "waiting" && (
                        <Grow in timeout={500 + index * 100} key={roomId}>
                          <ListItem 
                            divider
                            sx={{
                              "&:hover": {
                                background: "rgba(0,0,0,0.02)",
                              },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="h6" fontWeight="bold">
                                  Partie de {room.host}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                                  <Chip
                                    label={`${room.player_count}/${room.settings.maxPlayers} joueurs`}
                                    size="small"
                                    color={room.player_count >= room.settings.maxPlayers ? "error" : "primary"}
                                    variant="outlined"
                                  />
                                  <Chip
                                    label={room.status}
                                    size="small"
                                    color={room.status === "waiting" ? "success" : "warning"}
                                  />
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <StyledButton
                                variant="contained"
                                size="small"
                                onClick={() => {
                                  setGameCode(roomId);
                                  handleJoinGame(roomId);
                                }}
                                disabled={room.player_count >= 4}
                                sx={{
                                  background: room.player_count >= 4 
                                    ? "rgba(0,0,0,0.12)" 
                                    : "linear-gradient(45deg, #2196F3 30%, #1976D2 90%)",
                                  "&:hover": {
                                    background: room.player_count >= 4 
                                      ? "rgba(0,0,0,0.12)" 
                                      : "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                                  },
                                }}
                              >
                                {room.player_count >= room.settings.maxPlayers ? "Pleine" : "Rejoindre"}
                              </StyledButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        </Grow>
                        )
                      ))}
                      {Object.keys(rooms).length === 0 && (
                        <ListItem>
                          <ListItemText 
                            primary={
                              <Typography variant="body1" color="text.secondary" align="center">
                                Aucune partie disponible
                              </Typography>
                            }
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                </CardContent>
              </StyledCard>
            </Slide>
          </Box>
        </Box>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </GradientBackground>
  );
};

export default Lobby;
