import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { generateProblem, checkAnswer } from "@/lib/game-utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Runner } from "@/components/Runner";
import { Coach } from "@/components/Coach";

interface GameStats {
  totalQuestions: number;
  totalCorrect: number;
  totalIncorrect: number;
  startTime: number;
  totalResponseTime: number;
  typeStats: {
    addition: { correct: number; total: number };
    subtraction: { correct: number; total: number };
    multiplication: { correct: number; total: number };
    division: { correct: number; total: number };
    power: { correct: number; total: number };
    algebra: { correct: number; total: number };
  };
}

export default function GamePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState(generateProblem(1));
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [timeLeft, setTimeLeft] = useState(100);
  const [isActive, setIsActive] = useState(true);
  const [successfulProblems, setSuccessfulProblems] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxLevelReached, setMaxLevelReached] = useState(1);
  const [problemTypes, setProblemTypes] = useState(new Set<string>());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [gameStats, setGameStats] = useState<GameStats>({
    totalQuestions: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    startTime: Date.now(),
    totalResponseTime: 0,
    typeStats: {
      addition: { correct: 0, total: 0 },
      subtraction: { correct: 0, total: 0 },
      multiplication: { correct: 0, total: 0 },
      division: { correct: 0, total: 0 },
      power: { correct: 0, total: 0 },
      algebra: { correct: 0, total: 0 }
    }
  });

  const baseTime = 400;
  const timePerLevel = () => baseTime;

  useEffect(() => {
    handleRestart();
    return () => {
      submitGameRecord();
    };
  }, []);

  const submitGameRecord = () => {
    if (score > 0) {
      const avgResponseTime = gameStats.totalQuestions > 0 ? gameStats.totalResponseTime / gameStats.totalQuestions : 0;
      submitRecord.mutate({
        score,
        level: maxLevelReached,
        problemType: Array.from(problemTypes).join(', '),
        totalQuestions: gameStats.totalQuestions,
        totalCorrect: gameStats.totalCorrect,
        totalIncorrect: gameStats.totalIncorrect,
        avgResponseTime,
        additionCorrect: gameStats.typeStats.addition.correct,
        additionTotal: gameStats.typeStats.addition.total,
        subtractionCorrect: gameStats.typeStats.subtraction.correct,
        subtractionTotal: gameStats.typeStats.subtraction.total,
        multiplicationCorrect: gameStats.typeStats.multiplication.correct,
        multiplicationTotal: gameStats.typeStats.multiplication.total,
        divisionCorrect: gameStats.typeStats.division.correct,
        divisionTotal: gameStats.typeStats.division.total,
        powerCorrect: gameStats.typeStats.power.correct,
        powerTotal: gameStats.typeStats.power.total,
        algebraCorrect: gameStats.typeStats.algebra.correct,
        algebraTotal: gameStats.typeStats.algebra.total
      });
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let startTime = Date.now();

    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const slowdownFactor = 1 + (elapsedTime * 0.02);

        setTimeLeft((prevTime) => {
          const newTime = prevTime - (3 / slowdownFactor);
          if (newTime <= 0) {
            setIsActive(false);
            submitGameRecord();
          }
          return newTime;
        });
      }, timePerLevel());
    }
    return () => clearInterval(timer);
  }, [isActive, maxLevelReached, problemTypes, successfulProblems]);

  const submitRecord = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/game/record", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCorrect = checkAnswer(problem, Number(answer));

    // Update type stats for the current problem type
    setGameStats(prev => {
      const typeKey = problem.type as keyof typeof prev.typeStats;
      return {
        ...prev,
        totalQuestions: prev.totalQuestions + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        totalIncorrect: prev.totalIncorrect + (isCorrect ? 0 : 1),
        totalResponseTime: prev.totalResponseTime + ((Date.now() - questionStartTime) / 1000),
        typeStats: {
          ...prev.typeStats,
          [typeKey]: {
            correct: prev.typeStats[typeKey].correct + (isCorrect ? 1 : 0),
            total: prev.typeStats[typeKey].total + 1
          }
        }
      };
    });

    if (isCorrect) {
      setFeedback("correct");
      setScore(score + 10);
      setSuccessfulProblems(prev => prev + 1);
      setProblemTypes(prev => new Set(prev).add(problem.type));
      setTimeLeft(100);

      if (successfulProblems + 1 >= 5) {
        setCurrentLevel(prev => prev + 1);
        setMaxLevelReached(prev => Math.max(prev, currentLevel + 1));
        setSuccessfulProblems(0);
      }
    } else {
      setFeedback("incorrect");
    }

    setAnswer("");
    setTimeout(() => {
      setFeedback(null);
      if (isCorrect) {
        setProblem(generateProblem(currentLevel));
      }
      setQuestionStartTime(Date.now());
    }, 1000);
  };

  const handleRestart = () => {
    setScore(0);
    setTimeLeft(100);
    setIsActive(true);
    setSuccessfulProblems(0);
    setCurrentLevel(1);
    setMaxLevelReached(1);
    setProblemTypes(new Set());
    setProblem(generateProblem(1));
    setAnswer("");
    setFeedback(null);
    setQuestionStartTime(Date.now());
    setGameStats({
      totalQuestions: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      startTime: Date.now(),
      totalResponseTime: 0,
      typeStats: {
        addition: { correct: 0, total: 0 },
        subtraction: { correct: 0, total: 0 },
        multiplication: { correct: 0, total: 0 },
        division: { correct: 0, total: 0 },
        power: { correct: 0, total: 0 },
        algebra: { correct: 0, total: 0 }
      }
    });
  };

  const handleStopGame = () => {
    setIsActive(false);
    submitGameRecord();
  };

  const handleTargetReached = () => {
    setTimeLeft(prev => Math.min(prev + 20, 100));
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Math Runner</h1>
            <p className="text-muted-foreground">
              Niveau actuel : {currentLevel} ({successfulProblems}/5)
            </p>
          </div>
          <div className="space-x-4">
            {!isActive && (
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Tableau de bord
              </Button>
            )}
            {isActive && (
              <Button
                variant="outline"
                onClick={handleStopGame}
              >
                Arrêter la partie
              </Button>
            )}
            <div className="inline-block">
              <p className="text-sm font-medium">Score</p>
              <p className="text-2xl font-bold">{score}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Temps restant</p>
            <p className="text-sm">{Math.ceil(timeLeft)}%</p>
          </div>
          <Progress value={timeLeft} className="h-2" />
        </div>

        {feedback && (
          <Alert variant={feedback === "correct" ? "default" : "destructive"} className="animate-in fade-in">
            <div className="flex items-center gap-2">
              {feedback === "correct" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {feedback === "correct" ? "Correct !" : "Incorrect, essayez encore !"}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {isActive ? (
          <>
            <Runner onTargetReached={handleTargetReached} />
            <Coach
              gameStats={{
                typeStats: gameStats.typeStats,
                totalCorrect: gameStats.totalCorrect,
                totalIncorrect: gameStats.totalIncorrect,
                avgResponseTime: gameStats.totalQuestions > 0 ?
                  gameStats.totalResponseTime / gameStats.totalQuestions : 0
              }}
              currentLevel={currentLevel}
              timeLeft={timeLeft}
            />
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold mb-4">{problem.question}</p>
                    <Input
                      type="number"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="text-center text-2xl"
                      placeholder="Entrez votre réponse"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!answer}
                  >
                    Valider
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-bold mb-4">Partie terminée!</h2>
              <p className="mb-4">Score final: {score}</p>
              <p className="mb-4">Niveau maximum atteint: {maxLevelReached}</p>
              <Button onClick={handleRestart}>Nouvelle partie</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}