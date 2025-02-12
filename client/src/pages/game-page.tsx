import { useState, useEffect } from "react";
import { Link } from "wouter";
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

export default function GamePage() {
  const { user } = useAuth();
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState(generateProblem(user!.currentLevel));
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [timeLeft, setTimeLeft] = useState(100);
  const [isActive, setIsActive] = useState(true);

  const baseTime = 400; // 400ms de base au lieu de 2000ms
  const timePerLevel = () => Math.max(baseTime - (user!.currentLevel * 20), 200); // Réduit de 20ms par niveau, minimum 200ms

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let startTime = Date.now();

    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        const elapsedTime = (Date.now() - startTime) / 1000;

        // Facteur de ralentissement basé sur le niveau et le type d'opération
        let levelFactor = 1;
        if (user?.currentLevel === 1) {
          levelFactor = problem.type === "addition" || problem.type === "subtraction" ? 0.2 : 0.3;
        } else if (user?.currentLevel === 2) {
          levelFactor = problem.type === "multiplication" || problem.type === "division" ? 0.4 : 0.3;
        } else if (user?.currentLevel === 3) {
          levelFactor = 0.6;
        } else if (user?.currentLevel === 4) {
          levelFactor = 0.8;
        }

        const slowdownFactor = 1 + (elapsedTime * 0.02 * levelFactor); // Ralentissement très progressif

        setTimeLeft((prevTime) => {
          const newTime = prevTime - (3 / slowdownFactor); // Décrément 3x plus rapide
          if (newTime <= 0) {
            setIsActive(false);
            submitRecord.mutate({
              score,
              level: user!.currentLevel,
              problemType: problem.type
            });
          }
          return newTime;
        });
      }, timePerLevel());
    }
    return () => clearInterval(timer);
  }, [isActive, user?.currentLevel, problem.type]);

  const submitRecord = useMutation({
    mutationFn: async (data: { score: number; level: number; problemType: string }) => {
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

    if (checkAnswer(problem, Number(answer))) {
      setFeedback("correct");
      setScore(score + 10);
      setTimeLeft(100); // Réinitialise le temps pour le prochain problème
      setTimeout(() => {
        setProblem(generateProblem(user!.currentLevel));
        setAnswer("");
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback("incorrect");
      setAnswer(""); // Réinitialise juste la réponse, garde le même problème
      setTimeout(() => {
        setFeedback(null);
      }, 1000);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setTimeLeft(100);
    setIsActive(true);
    setProblem(generateProblem(user!.currentLevel));
    setAnswer("");
    setFeedback(null);
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Math Runner</h1>
            <p className="text-muted-foreground">Niveau {user?.currentLevel}</p>
          </div>
          <div className="space-x-4">
            <Link href="/dashboard">
              <Button variant="outline">Tableau de bord</Button>
            </Link>
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