import { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Paper,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import axios from "axios";
import socket from "../socket";

interface Player {
  id: string;
  name: string;
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

interface LobbyGameProps {
  isOwner: boolean;
  players: Player[];
  host: Player;
  roomId: string;
  onKickPlayer: (playerId: string) => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onGameStart: (quiz: Quiz, settings: GameSettings) => void;
  onViewChange: (view: "lobby" | "quiz") => void;
}

interface GameSettings {
  responseTime: number;
  maxPlayers: number;
}

const API_URL = "http://localhost:3000/api";

const LobbyGame = ({
  roomId = "",
  onKickPlayer = () => {},
  onUpdateSettings = () => {},
  onGameStart = () => {},
  onViewChange = () => {},
}: LobbyGameProps) => {
  const [settings, setSettings] = useState<GameSettings>({
    responseTime: 15,
    maxPlayers: 4,
  });
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [host, setHost] = useState<Player>({ id: "", name: "" });
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    // Récupérer le socket.id du cookie s'il existe
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
    };

    const savedSocketId = getCookie("socketId");

    if (!socket.id && savedSocketId) {
      // Si socket.id n'est pas défini mais qu'on a un cookie, on l'utilise
      socket.id = savedSocketId;
    } else if (socket.id) {
      // Si socket.id est défini, on le sauvegarde dans un cookie
      document.cookie = `socketId=${socket.id}; path=/`;
    }
  }, [socket.id]);

  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        console.log("Récupération des informations de la room:", roomId);
        const response = await axios.get(`${API_URL}/rooms/${roomId}`);
        const roomData = response.data;

        console.log("Données de la room reçues:", roomData);

        setSettings(roomData.settings);
        setSelectedQuiz(roomData.selected_quiz);
        setPlayers(roomData.players);
        setHost(roomData.host);

        if (roomData.host.id === socket.id) {
          setIsOwner(true);
        }

        console.log("isOwner", isOwner);
        console.log("host", host);
        console.log("socket.id", socket.id);

        socket.emit("room_info_updated", {
          room_id: roomId,
          players: roomData.players,
          host: roomData.host,
          settings: roomData.settings,
          selected_quiz: roomData.selected_quiz,
        });
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des informations de la room:",
          error
        );
        setError("Impossible de récupérer les informations de la room");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomInfo();
  }, [roomId]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (isOwner) {
        setIsLoadingQuizzes(true);
        try {
          const response = await axios.get(`${API_URL}/quizzes`);
          setAvailableQuizzes(response.data);
        } catch (error) {
          console.error("Erreur lors du chargement des quiz:", error);
        } finally {
          setIsLoadingQuizzes(false);
        }
      }
    };

    fetchQuizzes();
  }, [isOwner]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socket.on("settings_updated", (newSettings: GameSettings) => {
      setSettings(newSettings);
    });

    socket.on("quiz_selected", (data: { quiz: Quiz }) => {
      console.log("quiz_selected", data);
      setSelectedQuiz(data.quiz);
    });

    socket.on("error", (data: { message: string }) => {
      console.log("error", data);
      setError(data.message);
    });

    socket.on(
      "game_started",
      (data: { quiz: Quiz; settings: GameSettings }) => {
        console.log("game_started", data);
        onViewChange("quiz");
      }
    );

    socket.on("player_joined_room", (data: { players: Player[] }) => {
      console.log("player_joined_room", data);
      setPlayers(data.players);
    });

    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("connect");
      socket.off("settings_updated");
      socket.off("quiz_selected");
      socket.off("error");
      socket.off("game_started");
    };
  }, [isOwner, roomId, onViewChange]);

  const handleResponseTimeChange = (
    _event: Event,
    newValue: number | number[]
  ) => {
    if (isOwner) {
      const newSettings = { ...settings, responseTime: newValue as number };
      setSettings(newSettings);
      onUpdateSettings(newSettings);
      socket.emit("update_settings", {
        room_id: roomId,
        settings: newSettings,
      });
    }
  };

  const handleMaxPlayersChange = (
    _event: Event,
    newValue: number | number[]
  ) => {
    if (isOwner) {
      const newSettings = { ...settings, maxPlayers: newValue as number };
      setSettings(newSettings);
      onUpdateSettings(newSettings);
      socket.emit("update_settings", {
        room_id: roomId,
        settings: newSettings,
      });
    }
  };

  const handleQuizSelection = (quizId: string) => {
    if (isOwner) {
      socket.emit("select_quiz", { room_id: roomId, quiz_id: quizId });
    }
  };

  const handleStartGame = () => {
    if (isOwner) {
      socket.emit("start_game", { room_id: roomId });
      onViewChange("quiz");
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Typography>Chargement des informations de la room...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h4">Configuration de la partie</Typography>
          <Typography variant="h6" sx={{ color: "primary.main" }}>
            Code de la partie : {roomId}
          </Typography>
        </Box>

        {isOwner && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Sélection du QCM
            </Typography>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {availableQuizzes.map((quiz) => (
                <Paper
                  key={quiz.id}
                  elevation={selectedQuiz?.id === quiz.id ? 8 : 1}
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    bgcolor:
                      selectedQuiz?.id === quiz.id
                        ? "primary.light"
                        : "background.paper",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  onClick={() => handleQuizSelection(quiz.id)}
                >
                  <Typography variant="h6">{quiz.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {quiz.description}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {selectedQuiz && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              QCM sélectionné : {selectedQuiz.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedQuiz.description}
            </Typography>
            {isOwner && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleStartGame}
                disabled={players.length < 1}
              >
                Lancer la partie
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Typography gutterBottom>
                Temps de réponse par question: {settings.responseTime} secondes
              </Typography>
              <Slider
                value={settings.responseTime}
                onChange={handleResponseTimeChange}
                min={5}
                max={30}
                disabled={!isOwner}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography gutterBottom>
                Nombre maximum de joueurs: {settings.maxPlayers}
              </Typography>
              <Slider
                value={settings.maxPlayers}
                onChange={handleMaxPlayersChange}
                min={2}
                max={10}
                disabled={!isOwner}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Joueurs ({players.length + 1}/{settings.maxPlayers})
        </Typography>

        <List>
          <ListItem>
            <ListItemText
              primary={`${host.name} (Hôte)`}
              sx={{ color: "primary.main", fontWeight: "bold" }}
            />
          </ListItem>
          <Divider />
          {players
            .filter((player) => player.id !== host.id)
            .map((player) => (
              <ListItem key={player.id}>
                <ListItemText primary={player.name} />
                {isOwner && (
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="kick"
                      onClick={() => onKickPlayer(player.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
        </List>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default LobbyGame;
