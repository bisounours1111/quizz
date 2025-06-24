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
  Fade,
  Slide,
  Zoom,
  Grow,
  Chip,
  Avatar,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import QuizIcon from "@mui/icons-material/Quiz";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import axios from "axios";
import socket from "../socket";

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
    background:
      'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="10" cy="60" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="40" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>\')',
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

const QuizCard = styled(Paper)<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    padding: theme.spacing(3),
    cursor: "pointer",
    borderRadius: 12,
    background: selected
      ? "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)"
      : "rgba(255,255,255,0.9)",
    color: selected ? "white" : "inherit",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    border: selected
      ? "2px solid rgba(255,255,255,0.3)"
      : "1px solid rgba(0,0,0,0.1)",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
      background: selected
        ? "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)"
        : "rgba(255,255,255,1)",
    },
  })
);

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

const API_URL = "http://89.157.254.92:3001/api";

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
  const [copied, setCopied] = useState(false);

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
        const response = await axios.get(`${API_URL}/rooms/${roomId}`);
        const roomData = response.data;

        setSettings(roomData.settings);
        setSelectedQuiz(roomData.selected_quiz);
        setPlayers(roomData.players);
        setHost(roomData.host);

        if (roomData.host.id === socket.id) {
          setIsOwner(true);
        }

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
    socket.on("connect", () => {});

    socket.on("settings_updated", (newSettings: GameSettings) => {
      setSettings(newSettings);
    });

    socket.on("quiz_selected", (data: { quiz: Quiz }) => {
      setSelectedQuiz(data.quiz);
    });

    socket.on("error", (data: { message: string }) => {
      setError(data.message);
    });

    socket.on(
      "game_started",
      (data: { quiz: Quiz; settings: GameSettings }) => {
        onViewChange("quiz");
      }
    );

    socket.on("player_joined_room", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    return () => {
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <Container maxWidth="md">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100vh",
              gap: 3,
            }}
          >
            <Fade in timeout={1000}>
              <Typography
                variant="h5"
                sx={{
                  color: "white",
                  textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                Chargement des informations de la room...
              </Typography>
            </Fade>
            <LinearProgress
              sx={{
                width: "100%",
                maxWidth: 400,
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.3)",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(45deg, #4CAF50, #45a049)",
                },
              }}
            />
          </Box>
        </Container>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <Container maxWidth="lg" sx={{ py: 4, position: "relative", zIndex: 2 }}>
        <Fade in timeout={1000}>
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography
              variant="h3"
              sx={{
                color: "white",
                fontWeight: "bold",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                mb: 2,
              }}
            >
              🎮 Configuration de la partie
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <Chip
                label={`Code: ${roomId}`}
                color="primary"
                variant="filled"
                sx={{
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  backdropFilter: "blur(10px)",
                }}
              />
              <IconButton
                onClick={handleCopyCode}
                sx={{
                  color: "white",
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.3)",
                  },
                }}
              >
                <ContentCopyIcon />
              </IconButton>
            </Box>
            {copied && (
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.8)", mt: 1 }}
              >
                Code copié !
              </Typography>
            )}
          </Box>
        </Fade>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
            gap: 4,
          }}
        >
          {/* Section principale */}
          <Slide direction="right" in timeout={1200}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Sélection du quiz */}
              {isOwner && (
                <StyledCard>
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        mb: 3,
                      }}
                    >
                      <QuizIcon
                        sx={{ color: "primary.main", fontSize: "2rem" }}
                      />
                      <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                        Sélection du QCM
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 2,
                      }}
                    >
                      {availableQuizzes.map((quiz, index) => (
                        <Grow in timeout={500 + index * 200} key={quiz.id}>
                          <QuizCard
                            selected={selectedQuiz?.id === quiz.id}
                            onClick={() => handleQuizSelection(quiz.id)}
                            elevation={selectedQuiz?.id === quiz.id ? 8 : 2}
                          >
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "bold", mb: 1 }}
                            >
                              {quiz.title}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                              {quiz.description}
                            </Typography>
                            <Chip
                              label={`${quiz.questions.length} questions`}
                              size="small"
                              sx={{
                                mt: 2,
                                background:
                                  selectedQuiz?.id === quiz.id
                                    ? "rgba(255,255,255,0.2)"
                                    : "rgba(0,0,0,0.1)",
                                color:
                                  selectedQuiz?.id === quiz.id
                                    ? "white"
                                    : "inherit",
                              }}
                            />
                          </QuizCard>
                        </Grow>
                      ))}
                    </Box>
                  </CardContent>
                </StyledCard>
              )}

              {/* Quiz sélectionné */}
              {selectedQuiz && (
                <Slide direction="up" in timeout={1400}>
                  <StyledCard>
                    <CardContent sx={{ p: 4 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: 3,
                        }}
                      >
                        <QuizIcon
                          sx={{ color: "success.main", fontSize: "2rem" }}
                        />
                        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                          QCM sélectionné
                        </Typography>
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{ mb: 2, color: "primary.main" }}
                      >
                        {selectedQuiz.title}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 3, opacity: 0.8 }}>
                        {selectedQuiz.description}
                      </Typography>
                      {isOwner && (
                        <StyledButton
                          variant="contained"
                          color="success"
                          startIcon={<PlayArrowIcon />}
                          onClick={handleStartGame}
                          disabled={players.length < 1}
                          sx={{
                            background:
                              "linear-gradient(45deg, #4CAF50 30%, #45a049 90%)",
                            "&:hover": {
                              background:
                                "linear-gradient(45deg, #45a049 30%, #4CAF50 90%)",
                            },
                            "&:disabled": {
                              background: "rgba(0,0,0,0.12)",
                            },
                          }}
                        >
                          🚀 Lancer la partie
                        </StyledButton>
                      )}
                    </CardContent>
                  </StyledCard>
                </Slide>
              )}

              {/* Paramètres */}
              <StyledCard>
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <SettingsIcon
                      sx={{ color: "primary.main", fontSize: "2rem" }}
                    />
                    <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                      Paramètres de la partie
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                      gap: 4,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Temps de réponse: {settings.responseTime}s
                      </Typography>
                      <Slider
                        value={settings.responseTime}
                        onChange={handleResponseTimeChange}
                        min={5}
                        max={30}
                        disabled={!isOwner}
                        marks
                        valueLabelDisplay="auto"
                        sx={{
                          "& .MuiSlider-track": {
                            background:
                              "linear-gradient(45deg, #2196F3, #1976D2)",
                          },
                          "& .MuiSlider-thumb": {
                            background:
                              "linear-gradient(45deg, #2196F3, #1976D2)",
                          },
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        Joueurs max: {settings.maxPlayers}
                      </Typography>
                      <Slider
                        value={settings.maxPlayers}
                        onChange={handleMaxPlayersChange}
                        min={2}
                        max={10}
                        disabled={!isOwner}
                        marks
                        valueLabelDisplay="auto"
                        sx={{
                          "& .MuiSlider-track": {
                            background:
                              "linear-gradient(45deg, #4CAF50, #45a049)",
                          },
                          "& .MuiSlider-thumb": {
                            background:
                              "linear-gradient(45deg, #4CAF50, #45a049)",
                          },
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </StyledCard>
            </Box>
          </Slide>

          {/* Section joueurs */}
          <Slide direction="left" in timeout={1600}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
                >
                  <GroupIcon sx={{ color: "primary.main", fontSize: "2rem" }} />
                  <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                    Joueurs ({players.length + 1}/{settings.maxPlayers})
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <LinearProgress
                    variant="determinate"
                    value={((players.length + 1) / settings.maxPlayers) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "rgba(0,0,0,0.1)",
                      "& .MuiLinearProgress-bar": {
                        background: "linear-gradient(45deg, #4CAF50, #45a049)",
                      },
                    }}
                  />
                </Box>

                <List sx={{ p: 0 }}>
                  <Grow in timeout={800}>
                    <ListItem
                      sx={{
                        background:
                          "linear-gradient(135deg, #2196F3 0%, #1976D2 100%)",
                        borderRadius: 2,
                        mb: 2,
                        color: "white",
                      }}
                    >
                      <Avatar sx={{ mr: 2, bgcolor: "rgba(255,255,255,0.2)" }}>
                        👑
                      </Avatar>
                      <ListItemText
                        primary={`${host.name} (Hôte)`}
                        sx={{ fontWeight: "bold" }}
                      />
                    </ListItem>
                  </Grow>

                  {players
                    .filter((player) => player.id !== host.id)
                    .map((player, index) => (
                      <Grow in timeout={1000 + index * 200} key={player.id}>
                        <ListItem
                          sx={{
                            background: "rgba(0,0,0,0.02)",
                            borderRadius: 2,
                            mb: 1,
                            "&:hover": {
                              background: "rgba(0,0,0,0.05)",
                            },
                          }}
                        >
                          <Avatar sx={{ mr: 2, bgcolor: "primary.main" }}>
                            {player.name[0]}
                          </Avatar>
                          <ListItemText primary={player.name} />
                          {isOwner && (
                            <ListItemSecondaryAction>
                              <IconButton
                                edge="end"
                                aria-label="kick"
                                onClick={() => onKickPlayer(player.id)}
                                sx={{
                                  color: "error.main",
                                  "&:hover": {
                                    background: "rgba(244, 67, 54, 0.1)",
                                  },
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      </Grow>
                    ))}
                </List>
              </CardContent>
            </StyledCard>
          </Slide>
        </Box>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ width: "100%" }}
          >
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </GradientBackground>
  );
};

export default LobbyGame;
