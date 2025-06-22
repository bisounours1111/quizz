import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Button,
  List,
  ListItem,
  ListItemText,
  Paper,
  CircularProgress,
  Fade,
  Slide,
  Zoom,
  Grow,
  Chip,
  Avatar,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import axios from "axios";
import TimerIcon from "@mui/icons-material/Timer";
import GroupIcon from "@mui/icons-material/Group";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

interface PlayerAnswer {
  answer: string;
  response_time: number;
}

interface Answers {
  [key: string]: PlayerAnswer;
}

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

interface GameStartedData {
  settings: {
    responseTime: number;
  };
}

interface AllPlayersAnsweredData {
  answers: Answers;
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

const QuizzHost = () => {
  const { roomId } = useParams();
  const [timeLeft, setTimeLeft] = useState(30);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [playerAnswers, setPlayerAnswers] = useState<Answers>({});
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>(
    "Chargement du quiz..."
  );
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [gameFinished, setGameFinished] = useState(false);
  const [players, setPlayers] = useState<Array<{ sid: string; name: string }>>([]);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const roomResponse = await axios.get(
          `http://localhost:3000/api/rooms/${roomId}`
        );
        const selectedQuizId = roomResponse.data.selected_quiz?.id;

        if (selectedQuizId) {
          const quizResponse = await axios.get(
            `http://localhost:3000/api/quizzes`
          );
          const selectedQuiz = quizResponse.data.find(
            (q: Quiz) => q.id === selectedQuizId
          );

          if (selectedQuiz) {
            setQuiz(selectedQuiz);
            setConnectionStatus("Quiz chargé");
          } else {
            setConnectionStatus("Quiz non trouvé");
          }
        } else {
          setConnectionStatus("Aucun quiz sélectionné");
        }
      } catch (error) {
        console.error("Erreur lors du chargement du quiz:", error);
        setConnectionStatus("Erreur lors du chargement du quiz");
      }
    };

    fetchQuiz();
  }, [roomId]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connecté au serveur");
      if (roomId) {
        socket.emit("join_room", { room_id: roomId });
      }
    });

    socket.on("connect_error", (error: any) => {
      console.error("Erreur de connexion:", error);
    });

    socket.on("game_started", (data: GameStartedData) => {
      console.log("Jeu démarré:", data);
      setTimeLeft(data.settings.responseTime);
    });

    socket.on("all_players_answered", (data: AllPlayersAnsweredData) => {
      console.log("Tous les joueurs ont répondu:", data);
      setPlayerAnswers(data.answers);
      setShowScoreboard(true);
      updateScores(data.answers);
    });

    socket.on("quiz_finished", () => {
      setGameFinished(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (!showScoreboard) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showScoreboard]);

  const updateScores = (answers: Answers) => {
    const newScores = { ...scores };
    Object.entries(answers).forEach(([playerId, answer]) => {
      const currentQuestionData = quiz?.questions[currentQuestion];
      if (currentQuestionData) {
        const isCorrect =
          answer.answer ===
          currentQuestionData.options[currentQuestionData.correctAnswer];
        newScores[playerId] = (newScores[playerId] || 0) + (isCorrect ? 1 : 0);
      }
    });
    setScores(newScores);
  };

  const handleNextQuestion = () => {
    if (roomId) {
      socket.emit("next_question", { room_id: roomId });
      setShowScoreboard(false);
      setTimeLeft(30);
      setCurrentQuestion((prev) => prev + 1);
      setPlayerAnswers({});
    }
  };

  if (!quiz) {
    return (
      <GradientBackground>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
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
              {connectionStatus}
            </Typography>
          </Fade>
          <CircularProgress 
            sx={{ 
              color: "white",
              "& .MuiCircularProgress-circle": {
                strokeLinecap: "round",
              },
            }} 
          />
        </Box>
      </GradientBackground>
    );
  }

  if (gameFinished) {
    return (
      <GradientBackground>
        <Box
          sx={{
            p: 4,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 2,
          }}
        >
          <Fade in timeout={1000}>
            <Typography 
              variant="h3" 
              sx={{ 
                mb: 4,
                color: "white",
                fontWeight: "bold",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              🏆 Résultats finaux
            </Typography>
          </Fade>
          
          <Slide direction="up" in timeout={1200}>
            <StyledCard sx={{ p: 4, width: "100%", maxWidth: 600 }}>
              {Object.entries(scores).map(([playerId, score], index) => (
                <Grow in timeout={500 + index * 200} key={playerId}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 3,
                      p: 2,
                      borderRadius: 2,
                      background: index === 0 
                        ? "linear-gradient(135deg, #FFD700, #FFA500)"
                        : index === 1
                        ? "linear-gradient(135deg, #C0C0C0, #A9A9A9)"
                        : index === 2
                        ? "linear-gradient(135deg, #CD7F32, #B8860B)"
                        : "rgba(0,0,0,0.05)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32",
                        color: "white",
                        fontWeight: "bold"
                      }}>
                        {index + 1}
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        Joueur {playerId}
                      </Typography>
                    </Box>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      {score} pts
                    </Typography>
                  </Box>
                </Grow>
              ))}
            </StyledCard>
          </Slide>
        </Box>
      </GradientBackground>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];

  return (
    <GradientBackground>
      <Box
        sx={{
          p: 4,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Header avec timer et question */}
        <Fade in timeout={800}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography 
                variant="h4" 
                sx={{ 
                  color: "white",
                  fontWeight: "bold",
                  textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                Question {currentQuestion + 1}/{quiz.questions.length}
              </Typography>
              
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TimerIcon sx={{ color: "white", fontSize: "2rem" }} />
                <Box sx={{ minWidth: 120 }}>
                  <LinearProgress
                    variant="determinate"
                    value={(timeLeft / 30) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "rgba(255,255,255,0.3)",
                      "& .MuiLinearProgress-bar": {
                        background: timeLeft > 10 ? "linear-gradient(45deg, #4CAF50, #45a049)" : "linear-gradient(45deg, #f44336, #d32f2f)",
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
            </Box>
            
            <Typography 
              variant="h3" 
              sx={{ 
                color: "white",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {currentQuestionData.question}
            </Typography>
          </Box>
        </Fade>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 4, flex: 1 }}>
          {/* Options de réponse */}
          <Slide direction="right" in timeout={1000}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
                  Options de réponse
                </Typography>
                <Grid container spacing={3}>
                  {currentQuestionData.options.map((option, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Grow in timeout={600 + index * 200}>
                        <Paper
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            background: "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)",
                            border: "2px solid rgba(0,0,0,0.1)",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                            },
                          }}
                        >
                          <Typography variant="h6" fontWeight="bold">
                            {option}
                          </Typography>
                          {index === currentQuestionData.correctAnswer && (
                            <CheckCircleIcon 
                              sx={{ 
                                color: "success.main", 
                                fontSize: "2rem", 
                                mt: 1 
                              }} 
                            />
                          )}
                        </Paper>
                      </Grow>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </StyledCard>
          </Slide>

          {/* Réponses des joueurs */}
          <Slide direction="left" in timeout={1200}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                  <GroupIcon sx={{ color: "primary.main", fontSize: "2rem" }} />
                  <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                    Réponses des joueurs
                  </Typography>
                </Box>
                
                {showScoreboard ? (
                  <Box>
                    {Object.entries(playerAnswers).map(([playerId, answer], index) => (
                      <Grow in timeout={500 + index * 200} key={playerId}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 2,
                            p: 2,
                            borderRadius: 2,
                            background: "rgba(0,0,0,0.02)",
                            border: "1px solid rgba(0,0,0,0.1)",
                          }}
                        >
                          <Avatar sx={{ bgcolor: "primary.main" }}>
                            {playerId[0]}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="bold">
                              Joueur {playerId}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {answer.answer} ({answer.response_time}s)
                            </Typography>
                          </Box>
                          <Chip
                            label={answer.answer === currentQuestionData.options[currentQuestionData.correctAnswer] ? "Correct" : "Incorrect"}
                            color={answer.answer === currentQuestionData.options[currentQuestionData.correctAnswer] ? "success" : "error"}
                            size="small"
                          />
                        </Box>
                      </Grow>
                    ))}
                    
                    <Grow in timeout={1500}>
                      <StyledButton
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleNextQuestion}
                        startIcon={<PlayArrowIcon />}
                        sx={{
                          mt: 3,
                          background: "linear-gradient(45deg, #2196F3 30%, #1976D2 90%)",
                          "&:hover": {
                            background: "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                          },
                        }}
                      >
                        Question suivante
                      </StyledButton>
                    </Grow>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                      En attente des réponses...
                    </Typography>
                    <CircularProgress 
                      sx={{ 
                        color: "primary.main",
                        "& .MuiCircularProgress-circle": {
                          strokeLinecap: "round",
                        },
                      }} 
                    />
                  </Box>
                )}
              </CardContent>
            </StyledCard>
          </Slide>
        </Box>
      </Box>
    </GradientBackground>
  );
};

export default QuizzHost;
