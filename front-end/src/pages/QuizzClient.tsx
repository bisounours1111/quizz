import {
  Box,
  Card,
  Typography,
  Button,
  CircularProgress,
  Paper,
} from "@mui/material";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import socket from "../socket";
import axios from "axios";

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [currentView, setCurrentView] = useState<View>("loading");
  const [playerAnswers, setPlayerAnswers] = useState<Answers>({});
  const [isHost, setIsHost] = useState(false);
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [players, setPlayers] = useState<Array<{ sid: string; name: string }>>(
    []
  );

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const roomResponse = await axios.get(
          `http://localhost:3000/api/rooms/${roomId}`
        );
        const selectedQuizId = roomResponse.data.selected_quiz?.id;
        setIsHost(roomResponse.data.host.id === socket.id);
        setPlayers(roomResponse.data.players || []);

        if (selectedQuizId) {
          const quizResponse = await axios.get(
            `http://localhost:3000/api/quizzes`
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
      setCurrentView("quiz");
      setPlayers(data.players || []);
    });

    socket.on("all_players_answered", (data: { answers: Answers }) => {
      setPlayerAnswers(data.answers);
      setCurrentView("scoreboard");
      updateScores(data.answers);
    });

    socket.on("next_question", () => {
      setCurrentView("quiz");
      setSelectedColor(null);
      setCurrentQuestion((prev) => prev + 1);
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

  const handleStartGame = () => {
    if (roomId) {
      socket.emit("start_game", { room_id: roomId });
    }
  };

  const handleAnswerClick = (color: string) => {
    if (socket && roomId) {
      socket.emit("player_answer", {
        room_id: roomId,
        answer: color,
      });
      setSelectedColor(color);
    }
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <Typography variant="h4">Lobby</Typography>
        <Typography>Joueurs connectés : {players.length}</Typography>
        <Button variant="contained" onClick={handleStartGame} size="large">
          Démarrer le quiz
        </Button>
      </Box>
    );
  }

  if (currentView === "finished") {
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
          {Object.entries(scores).map(([playerId, score]) => {
            const player = players.find((p) => p.sid === playerId);
            return (
              <Box
                key={playerId}
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography>{player?.name || `Joueur ${playerId}`}</Typography>
                <Typography>{score} points</Typography>
              </Box>
            );
          })}
        </Paper>
      </Box>
    );
  }

  if (currentView === "scoreboard") {
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
        <Paper sx={{ p: 3, width: "100%", maxWidth: 600 }}>
          {Object.entries(scores).map(([playerId, score]) => {
            const player = players.find((p) => p.sid === playerId);
            return (
              <Box
                key={playerId}
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Typography>{player?.name || `Joueur ${playerId}`}</Typography>
                <Typography>{score} points</Typography>
              </Box>
            );
          })}
        </Paper>
      </Box>
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];
  const answers = [
    { color: "#3fa535", text: currentQuestionData.options[0] },
    { color: "#db2b39", text: currentQuestionData.options[1] },
    { color: "#29335c", text: currentQuestionData.options[2] },
    { color: "#f3a712", text: currentQuestionData.options[3] },
  ];

  if (selectedColor) {
    return (
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          backgroundColor: selectedColor,
          margin: 0,
          padding: 0,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
        >
          Réponse enregistrée
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        backgroundColor: "#F4BBD3",
        margin: 0,
        padding: 2.5,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          textAlign: "center",
          color: "white",
          textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        {currentQuestionData.question}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "20px",
          flex: 1,
        }}
      >
        {answers.map((answer, index) => (
          <Card
            key={index}
            onClick={() => handleAnswerClick(answer.color)}
            sx={{
              bgcolor: answer.color,
              width: "100%",
              height: "100%",
              cursor: "pointer",
              transition: "transform 0.2s",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              "&:hover": {
                transform: "scale(1.02)",
              },
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: "white", textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
            >
              {answer.text}
            </Typography>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default QuizzClient;
