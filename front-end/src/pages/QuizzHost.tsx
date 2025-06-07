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
} from "@mui/material";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import axios from "axios";

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

  if (gameFinished) {
    return (
      <Box
        sx={{
          p: 3,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ mb: 4 }}>
          Résultats finaux
        </Typography>
        <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
          {Object.entries(scores).map(([playerId, score]) => (
            <Box
              key={playerId}
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography>Joueur {playerId}</Typography>
              <Typography>{score} points</Typography>
            </Box>
          ))}
        </Paper>
      </Box>
    );
  }

  if (showScoreboard) {
    return (
      <Box
        sx={{
          p: 3,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" sx={{ mb: 4 }}>
          Scores
        </Typography>
        <Paper sx={{ p: 3, width: "100%", maxWidth: 600, mb: 4 }}>
          {Object.entries(scores).map(([playerId, score]) => (
            <Box
              key={playerId}
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography>Joueur {playerId}</Typography>
              <Typography>{score} points</Typography>
            </Box>
          ))}
        </Paper>
        <Button variant="contained" onClick={handleNextQuestion} size="large">
          Question suivante
        </Button>
      </Box>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];

  return (
    <Box
      sx={{ p: 3, height: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Question {currentQuestion + 1}/{quiz.questions.length}
        </Typography>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {currentQuestionData.question}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(timeLeft / 30) * 100}
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="body1" sx={{ mt: 1 }}>
          Temps restant: {timeLeft} secondes
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {currentQuestionData.options.map((option, index) => (
          <Grid item xs={6} key={index}>
            <Card
              sx={{
                p: 2,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  index === currentQuestionData.correctAnswer
                    ? "#4caf50"
                    : "#f5f5f5",
              }}
            >
              <Typography variant="h6">{option}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Réponses reçues:
        </Typography>
        <List>
          {Object.entries(playerAnswers).map(([playerId, answer]) => (
            <ListItem key={playerId}>
              <ListItemText
                primary={`Joueur ${playerId}`}
                secondary={`Réponse: ${
                  answer.answer
                } (${answer.response_time.toFixed(1)}s)`}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default QuizzHost;
