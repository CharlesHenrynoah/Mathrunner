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

export default function GamePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState(generateProblem(user!.currentLevel));
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [timeLeft, setTimeLeft] = useState(100);
  const [isActive, setIsActive] = useState(true);
  const [successfulProblems, setSuccessfulProblems] = useState(0);

  const baseTime = 400;
  const timePerLevel = () => baseTime;

  // Réinitialiser le jeu quand la page est chargée
  useEffect(() => {
    handleRestart();
    // Nettoyage : sauvegarder le score quand l'utilisateur quitte la page
    return () => {
      if (score > 0) {
        submitRecord.mutate({
          score,
          level: user!.currentLevel,
          problemType: problem.type,
          successfulProblems
        });
      }
    };
  }, []);

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
            submitRecord.mutate({
              score,
              level: user!.currentLevel,
              problemType: problem.type,
              successfulProblems
            });
          }
          return newTime;
        });
      }, timePerLevel());
    }
    return () => clearInterval(timer);
  }, [isActive, problem.type, successfulProblems]);

  const submitRecord = useMutation({
    mutationFn: async (data: { score: number; level: number; problemType: string; successfulProblems: number }) => {
      const res = await apiRequest("POST", "/api/game/record", data);
      return res.json();
    },
    onSuccess: (data) => {
      // Reset level to 0 after submitting score
      if (user) {
        user.currentLevel = 0;
      }
      setSuccessfulProblems(0);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (checkAnswer(problem, Number(answer))) {
      setFeedback("correct");
      setScore(score + 10);
      setSuccessfulProblems(prev => prev + 1);
      setTimeLeft(100);

      if (successfulProblems + 1 >= 5) {
        submitRecord.mutate({
          score,
          level: user!.currentLevel,
          problemType: problem.type,
          successfulProblems: successfulProblems + 1
        });
      }

      setTimeout(() => {
        setProblem(generateProblem(user!.currentLevel));
        setAnswer("");
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback("incorrect");
      setAnswer("");
      setTimeout(() => {
        setFeedback(null);
      }, 1000);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setTimeLeft(100);
    setIsActive(true);
    setSuccessfulProblems(0);
    if (user) {
      user.currentLevel = 0;
    }
    setProblem(generateProblem(0)); // Start at level 0
    setAnswer("");
    setFeedback(null);
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
            <p className="text-muted-foreground">Niveau {user?.currentLevel} ({successfulProblems}/5)</p>
          </div>
          <div className="space-x-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsActive(false);
                if (score > 0) {
                  submitRecord.mutate({
                    score,
                    level: user!.currentLevel,
                    problemType: problem.type,
                    successfulProblems
                  });
                }
                navigate("/dashboard");
              }}
            >
              Tableau de bord
            </Button>
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
              <Button onClick={handleRestart}>Nouvelle partie</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}