import {
  Box,
  Card,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Fade,
  Slide,
  Zoom,
  Grow,
  Chip,
  Avatar,
  LinearProgress,
} from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import axios from "axios";
import Podium from "./Podium";
import { styled } from "@mui/material/styles";

// Composants stylisés
const StyledCard = styled(Card)(({ theme }) => ({
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
  },
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
    zIndex: 1,
  },
}));

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

const AnswerCard = styled(Card)<{ selected?: boolean }>(
  ({ theme, selected }) => ({
    background: selected ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
    backdropFilter: "blur(10px)",
    border: selected
      ? "2px solid rgba(255,255,255,0.8)"
      : "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    overflow: "hidden",
    "&:hover": {
      transform: "scale(1.05)",
      boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
      background: "rgba(255,255,255,0.15)",
      border: "2px solid rgba(255,255,255,0.6)",
    },
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background:
        "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
      zIndex: 1,
    },
  })
);

interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
}

interface PlayerAnswer {
  answer: string;
  response_time: number;
  player_name: string;
}

interface Answers {
  [key: string]: PlayerAnswer;
}

interface GameStartedData {
  quiz: Quiz;
  settings: {
    responseTime: number;
    maxPlayers: number;
  };
  players: Array<{ sid: string; name: string }>;
}

type View = "loading" | "lobby" | "quiz" | "scoreboard" | "finished";

const QuizzClient = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentView, setCurrentView] = useState<View>("loading");
  const [isHost, setIsHost] = useState(false);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const socketIdRef = useRef<string | null>(null);
  const isHostRef = useRef(false);
  const [defaultTimer, setDefaultTimer] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(defaultTimer);
  const hasAnsweredRef = useRef(false);

  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [players, setPlayers] = useState<Array<{ sid: string; name: string }>>(
    []
  );
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [questionData, setQuestionData] = useState<any>(null);

  useEffect(() => {
    const updateSocketId = () => {
      socketIdRef.current = socket.id;
    };

    updateSocketId();
    socket.on("connect", updateSocketId);

    return () => {
      socket.off("connect", updateSocketId);
    };
  }, []);

  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const roomResponse = await axios.get(
          `http://89.157.254.92:3001/api/rooms/${roomId}`
        );
        const selectedQuizId = roomResponse.data.selected_quiz?.id;
        const currentSocketId = socketIdRef.current || socket.id;
        const hostStatus = roomResponse.data.host.id === currentSocketId;
        setIsHost(hostStatus);
        setPlayers(roomResponse.data.players || []);

        if (selectedQuizId) {
          const quizResponse = await axios.get(
            `http://89.157.254.92:3001/api/quizzes`
          );
          const selectedQuiz = quizResponse.data.find(
            (q: Quiz) => q.id === selectedQuizId
          );
          if (selectedQuiz) {
            setQuiz(selectedQuiz);
          }
        }
        setCurrentView("lobby");
      } catch (error) {
        console.error("Erreur lors du chargement du quiz:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [roomId]);

  useEffect(() => {
    socket.on("game_started", (data: GameStartedData) => {
      setDefaultTimer(data.settings.responseTime);
      setCurrentView("quiz");
      setPlayers(data.players || []);
    });

    socket.on(
      "all_players_answered",
      (data: {
        scoreboard: { [key: string]: number };
        correct_answer: string;
        current_question: any;
      }) => {
        setScores(data.scoreboard);
        setCorrectAnswer(data.correct_answer);
        setQuestionData(data.current_question);
        setCurrentView("scoreboard");
        console.log(data.scoreboard);
        console.log("Is Host (from ref):", isHostRef.current);
      }
    );

    socket.on("next_question", () => {
      setCurrentView("quiz");
      setSelectedColor(null);
      setCurrentQuestion((prev) => prev + 1);
      setCorrectAnswer("");
      setQuestionData(null);
    });

    socket.on("quiz_finished", () => {
      setCurrentView("finished");
    });

    return () => {
      socket.off("game_started");
      socket.off("all_players_answered");
      socket.off("next_question");
      socket.off("quiz_finished");
    };
  }, []);

  // Reset hasAnswered when question changes
  useEffect(() => {
    hasAnsweredRef.current = false;
  }, [currentQuestion]);

  // Timer effect
  useEffect(() => {
    if (currentView === "quiz" && !selectedColor && !hasAnsweredRef.current) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Envoyer automatiquement une réponse "default" quand le temps est écoulé
            // Vérifier que selectedColor est toujours null pour éviter les doubles envois
            if (socket && roomId && !selectedColor && !hasAnsweredRef.current) {
              hasAnsweredRef.current = true;
              socket.emit("player_answer", {
                room_id: roomId,
                answer: "default",
              });
              setSelectedColor("default");
              setShowAnswerFeedback(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentView, selectedColor, socket, roomId, isHost]);

  // Reset timer when question changes
  useEffect(() => {
    setTimeLeft(defaultTimer);
  }, [currentQuestion]);

  const handleStartGame = () => {
    if (roomId) {
      socket.emit("start_game", { room_id: roomId });
    }
  };

  const handleNextQuestion = () => {
    if (roomId) {
      socket.emit("start_next_question", { room_id: roomId });
    }
  };

  const handleAnswerClick = (color: string) => {
    if (socket && roomId && !selectedColor && !hasAnsweredRef.current) {
      hasAnsweredRef.current = true;
      socket.emit("player_answer", {
        room_id: roomId,
        answer: color,
      });
      setSelectedColor(color);
      setShowAnswerFeedback(true);
      setTimeLeft(defaultTimer);
    }
  };

  const handleReturnHome = () => {
    navigate("/");
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Typography variant="h5">Aucun quiz sélectionné</Typography>
      </Box>
    );
  }

  if (currentView === "lobby" && isHost) {
    return (
      <GradientBackground>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            gap: 4,
            position: "relative",
            zIndex: 2,
          }}
        >
          <Fade in timeout={1000}>
            <Box sx={{ textAlign: "center" }}>
              <Typography
                variant="h2"
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                  mb: 2,
                }}
              >
                🎮 Lobby
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: "rgba(255,255,255,0.9)",
                  mb: 4,
                }}
              >
                Joueurs connectés : {players.length}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                  justifyContent: "center",
                  mb: 4,
                }}
              >
                {players.map((player, index) => (
                  <Zoom in timeout={500 + index * 200} key={player.sid}>
                    <Chip
                      avatar={<Avatar>{player.name[0]}</Avatar>}
                      label={player.name}
                      sx={{
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    />
                  </Zoom>
                ))}
              </Box>

              <Grow in timeout={1500}>
                <Button
                  variant="contained"
                  onClick={handleStartGame}
                  size="large"
                  sx={{
                    background:
                      "linear-gradient(45deg, #4CAF50 30%, #45a049 90%)",
                    color: "white",
                    fontSize: "1.2rem",
                    padding: "12px 32px",
                    borderRadius: "25px",
                    boxShadow: "0 4px 15px rgba(76, 175, 80, 0.4)",
                    "&:hover": {
                      background:
                        "linear-gradient(45deg, #45a049 30%, #4CAF50 90%)",
                      boxShadow: "0 6px 20px rgba(76, 175, 80, 0.6)",
                    },
                  }}
                >
                  🚀 Démarrer le quiz
                </Button>
              </Grow>
            </Box>
          </Fade>
        </Box>
      </GradientBackground>
    );
  }

  if (currentView === "finished") {
    return (
      <Podium
        currentView={currentView}
        scores={scores}
        players={players}
        onReturnHome={handleReturnHome}
      />
    );
  }

  if (currentView === "scoreboard") {
    return (
      <GradientBackground>
        <Box
          sx={{
            p: 4,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <Fade in timeout={800}>
            <Typography
              variant="h3"
              sx={{
                mb: 4,
                color: "white",
                fontWeight: "bold",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              📊 Scores
            </Typography>
          </Fade>

          {/* Affichage de la bonne réponse */}
          {correctAnswer && questionData && (
            <Slide direction="down" in timeout={1200}>
              <Paper
                sx={{
                  p: 3,
                  width: "100%",
                  maxWidth: 600,
                  background: "rgba(76, 175, 80, 0.95)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 3,
                  boxShadow: "0 8px 32px rgba(76, 175, 80, 0.3)",
                  mb: 3,
                  border: "2px solid rgba(255,255,255,0.3)",
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "white",
                      mb: 2,
                      fontWeight: "bold",
                      textShadow: "1px 1px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    Question : {questionData.question}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textShadow: "1px 1px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    ✅ Bonne réponse : {correctAnswer}
                  </Typography>
                </Box>
              </Paper>
            </Slide>
          )}

          <Slide direction="up" in timeout={1000}>
            <Paper
              sx={{
                p: 4,
                width: "100%",
                maxWidth: 600,
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(10px)",
                borderRadius: 3,
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              }}
            >
              {Object.entries(scores).map(([playerId, score], index) => {
                const player = players.find((p) => p.sid === playerId);
                return (
                  <Grow in timeout={500 + index * 200} key={playerId}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                        p: 2,
                        borderRadius: 2,
                        background:
                          index === 0
                            ? "linear-gradient(45deg, #FFD700, #FFA500)"
                            : index === 1
                            ? "linear-gradient(45deg, #C0C0C0, #A9A9A9)"
                            : index === 2
                            ? "linear-gradient(45deg, #CD7F32, #B8860B)"
                            : "rgba(0,0,0,0.05)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor:
                              index === 0
                                ? "#FFD700"
                                : index === 1
                                ? "#C0C0C0"
                                : "#CD7F32",
                            color: "white",
                            fontWeight: "bold",
                          }}
                        >
                          {index + 1}
                        </Avatar>
                        <Typography variant="h6" fontWeight="bold">
                          {player?.name || `Joueur ${playerId}`}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        color="primary"
                      >
                        {score} pts
                      </Typography>
                    </Box>
                  </Grow>
                );
              })}
            </Paper>
          </Slide>

          {isHost && (
            <Grow in timeout={2000}>
              <Button
                variant="contained"
                onClick={handleNextQuestion}
                size="large"
                sx={{
                  mt: 4,
                  background:
                    "linear-gradient(45deg, #2196F3 30%, #1976D2 90%)",
                  color: "white",
                  fontSize: "1.1rem",
                  padding: "12px 28px",
                  borderRadius: "25px",
                  boxShadow: "0 4px 15px rgba(33, 150, 243, 0.4)",
                  "&:hover": {
                    background:
                      "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                    boxShadow: "0 6px 20px rgba(33, 150, 243, 0.6)",
                  },
                }}
              >
                ➡️ Question suivante
              </Button>
            </Grow>
          )}
        </Box>
      </GradientBackground>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];
  const answers = [
    { color: "#3fa535", text: currentQuestionData.options[0] },
    { color: "#db2b39", text: currentQuestionData.options[1] },
    { color: "#29335c", text: currentQuestionData.options[2] },
    { color: "#f3a712", text: currentQuestionData.options[3] },
  ];

  if (selectedColor && showAnswerFeedback && !isHost) {
    return (
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          background:
            selectedColor === "default"
              ? "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)"
              : `linear-gradient(135deg, ${selectedColor} 0%, ${selectedColor}dd 100%)`,
          margin: 0,
          padding: 0,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
        }}
      >
        <Zoom in timeout={500}>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h2"
              sx={{
                color: "white",
                textShadow: "2px 2px 8px rgba(0,0,0,0.5)",
                mb: 2,
                fontWeight: "bold",
              }}
            >
              {selectedColor === "default"
                ? "⏰ Temps écoulé !"
                : "✅ Réponse enregistrée !"}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: "rgba(255,255,255,0.9)",
                textShadow: "1px 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {selectedColor === "default"
                ? "Aucune réponse sélectionnée"
                : "En attente des autres joueurs..."}
            </Typography>
          </Box>
        </Zoom>
      </Box>
    );
  }

  return (
    <GradientBackground>
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          margin: 0,
          padding: 3,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Header avec timer */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Fade in timeout={800}>
            <Typography
              variant="h4"
              sx={{
                color: "white",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                fontWeight: "bold",
                flex: 1,
                textAlign: "center",
              }}
            >
              {isHost ? currentQuestionData.question : "Question en cours..."}
            </Typography>
          </Fade>

          <Box sx={{ minWidth: 120 }}>
            <LinearProgress
              variant="determinate"
              value={(timeLeft / defaultTimer) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.3)",
                "& .MuiLinearProgress-bar": {
                  background:
                    timeLeft > 5
                      ? "linear-gradient(45deg, #4CAF50, #45a049)"
                      : "linear-gradient(45deg, #f44336, #d32f2f)",
                },
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: "white",
                textAlign: "center",
                mt: 1,
                fontWeight: "bold",
                textShadow: "1px 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              {timeLeft}s
            </Typography>
          </Box>
        </Box>

        {/* Grille des réponses */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: 3,
            flex: 1,
          }}
        >
          {answers.map((answer, index) => (
            <Zoom in timeout={500 + index * 200} key={index}>
              <AnswerCard
                onClick={() => handleAnswerClick(answer.text)}
                selected={selectedColor === answer.text}
                sx={{
                  background: `linear-gradient(135deg, ${answer.color} 0%, ${answer.color}dd 100%)`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: "white",
                    textShadow: "2px 2px 8px rgba(0,0,0,0.5)",
                    fontWeight: "bold",
                    textAlign: "center",
                    zIndex: 2,
                  }}
                >
                  {isHost ? answer.text : ""}
                </Typography>
              </AnswerCard>
            </Zoom>
          ))}
        </Box>
      </Box>
    </GradientBackground>
  );
};

export default QuizzClient;
