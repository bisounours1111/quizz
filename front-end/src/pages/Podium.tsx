import { Box, Typography, Paper, Button, Fade, Slide, Zoom, Grow, Avatar, Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState, useEffect } from "react";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import HomeIcon from "@mui/icons-material/Home";

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

const StyledPaper = styled(Paper)(({ theme }) => ({
  background: "rgba(255,255,255,0.95)",
  backdropFilter: "blur(10px)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
  border: "1px solid rgba(255,255,255,0.2)",
  overflow: "hidden",
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

const Podium = ({ currentView, scores, players, onReturnHome }: { currentView: string, scores: { [key: string]: number }, players: { sid: string, name: string }[], onReturnHome: () => void }) => {
  const [showIndexes, setShowIndexes] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (currentView === "finished") {
      let i = 0;
      const interval = setInterval(() => {
        setShowIndexes((prev) => [...prev, i]);
        i++;
        if (i >= Object.keys(scores).length) {
          clearInterval(interval);
          setShowConfetti(true);
        }
      }, 600);
      return () => clearInterval(interval);
    }
  }, [currentView, scores]);

  if (currentView !== "finished") return null;

  const sortedScores = Object.entries(scores).sort(
    (a, b) => b[1] - a[1]
  );

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return "🥇";
      case 1:
        return "🥈";
      case 2:
        return "🥉";
      default:
        return `${position + 1}`;
    }
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 0:
        return "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)";
      case 1:
        return "linear-gradient(135deg, #C0C0C0 0%, #A9A9A9 100%)";
      case 2:
        return "linear-gradient(135deg, #CD7F32 0%, #B8860B 100%)";
      default:
        return "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)";
    }
  };

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
          gap: 4,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 2,
                color: "white",
                fontWeight: "bold",
                textShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: "2.5rem" }} />
              Résultats finaux
              <EmojiEventsIcon sx={{ fontSize: "2.5rem" }} />
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: "rgba(255,255,255,0.9)",
                textShadow: "1px 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              Félicitations à tous les participants !
            </Typography>
          </Box>
        </Fade>

        <Slide direction="up" in timeout={1200}>
          <StyledPaper sx={{ p: 4, width: "100%", maxWidth: 700 }}>
            {sortedScores.map(([playerId, score], index) => {
              const player = players.find((p) => p.sid === playerId);
              return (
                <Grow in timeout={800 + index * 300} key={playerId}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: index < sortedScores.length - 1 ? 3 : 0,
                      p: 3,
                      borderRadius: 3,
                      background: getPositionColor(index),
                      boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                      border: index < 3 ? "2px solid rgba(255,255,255,0.3)" : "1px solid rgba(0,0,0,0.1)",
                      position: "relative",
                      overflow: "hidden",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                        zIndex: 1,
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3, zIndex: 2, position: "relative" }}>
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          background: index < 3 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.1)",
                          color: index < 3 ? "#333" : "#666",
                          border: index < 3 ? "3px solid rgba(255,255,255,0.8)" : "2px solid rgba(0,0,0,0.1)",
                        }}
                      >
                        {getMedalIcon(index)}
                      </Avatar>
                      <Box>
                        <Typography 
                          variant="h5" 
                          fontWeight="bold"
                          sx={{ 
                            color: index < 3 ? "#333" : "#666",
                            textShadow: index < 3 ? "1px 1px 2px rgba(0,0,0,0.1)" : "none",
                          }}
                        >
                          {player?.name || `Joueur ${playerId}`}
                        </Typography>
                        <Chip
                          label={`${index + 1}${index === 0 ? "er" : index === 1 ? "nd" : index === 2 ? "rd" : "ème"} place`}
                          size="small"
                          sx={{
                            background: index < 3 ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.1)",
                            color: index < 3 ? "#333" : "#666",
                            fontWeight: "bold",
                            mt: 0.5,
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ zIndex: 2, position: "relative" }}>
                      <Typography 
                        variant="h3" 
                        fontWeight="bold"
                        sx={{ 
                          color: index < 3 ? "#333" : "#666",
                          textShadow: index < 3 ? "1px 1px 2px rgba(0,0,0,0.1)" : "none",
                        }}
                      >
                        {score}
                      </Typography>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          color: index < 3 ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        points
                      </Typography>
                    </Box>
                  </Box>
                </Grow>
              );
            })}
          </StyledPaper>
        </Slide>

        <Grow in timeout={2500}>
          <StyledButton
            variant="contained"
            color="primary"
            onClick={onReturnHome}
            startIcon={<HomeIcon />}
            sx={{
              mt: 4,
              background: "linear-gradient(45deg, #2196F3 30%, #1976D2 90%)",
              color: "white",
              fontSize: "1.2rem",
              padding: "15px 40px",
              borderRadius: "30px",
              boxShadow: "0 4px 15px rgba(33, 150, 243, 0.4)",
              "&:hover": {
                background: "linear-gradient(45deg, #1976D2 30%, #2196F3 90%)",
                boxShadow: "0 6px 20px rgba(33, 150, 243, 0.6)",
              },
            }}
          >
            Retour à l'accueil
          </StyledButton>
        </Grow>

        {/* Confetti effect */}
        {showConfetti && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {[...Array(50)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: "absolute",
                  width: 8,
                  height: 8,
                  background: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"][i % 5],
                  borderRadius: "50%",
                  animation: `confetti ${2 + Math.random() * 3}s linear infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                  left: `${Math.random() * 100}%`,
                  top: "-10px",
                  "@keyframes confetti": {
                    "0%": {
                      transform: "translateY(-10px) rotate(0deg)",
                      opacity: 1,
                    },
                    "100%": {
                      transform: "translateY(100vh) rotate(720deg)",
                      opacity: 0,
                    },
                  },
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    </GradientBackground>
  );
};

export default Podium;
