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

interface StatistiquesJeu {
  totalQuestions: number;
  totalCorrectes: number;
  totalIncorrectes: number;
  startTime: number;
  totalResponseTime: number;
  typeStats: {
    addition: { correctes: number; total: number };
    soustraction: { correctes: number; total: number };
    multiplication: { correctes: number; total: number };
    division: { correctes: number; total: number };
    puissance: { correctes: number; total: number };
    algebra: { correctes: number; total: number };
  };
}

export default function GamePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [reponse, setReponse] = useState("");
  const [score, setScore] = useState(0);
  const [probleme, setProbleme] = useState(generateProblem(1));
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [tempsRestant, setTempsRestant] = useState(100);
  const [estActif, setEstActif] = useState(true);
  const [problemesReussis, setProblemesReussis] = useState(0);
  const [niveauActuel, setNiveauActuel] = useState(1);
  const [niveauMaxAtteint, setNiveauMaxAtteint] = useState(1);
  const [typesProblemes, setTypesProblemes] = useState(new Set<string>());
  const [debutQuestion, setDebutQuestion] = useState(Date.now());
  const [statsJeu, setStatsJeu] = useState<StatistiquesJeu>({
    totalQuestions: 0,
    totalCorrectes: 0,
    totalIncorrectes: 0,
    startTime: Date.now(),
    totalResponseTime: 0,
    typeStats: {
      addition: { correctes: 0, total: 0 },
      soustraction: { correctes: 0, total: 0 },
      multiplication: { correctes: 0, total: 0 },
      division: { correctes: 0, total: 0 },
      puissance: { correctes: 0, total: 0 },
      algebra: { correctes: 0, total: 0 }
    }
  });

  const tempsBase = 400;
  const tempsParNiveau = () => tempsBase;

  useEffect(() => {
    handleRestart();
    return () => {
      soumettreEnregistrementPartie();
    };
  }, []);

  const soumettreEnregistrementPartie = () => {
    if (score > 0) {
      const tempsReponseMoyen = statsJeu.totalQuestions > 0 ? statsJeu.totalResponseTime / statsJeu.totalQuestions : 0;
      soumettreRecord.mutate({
        score,
        niveau: niveauMaxAtteint,
        typeProbleme: Array.from(typesProblemes).join(', '),
        totalQuestions: statsJeu.totalQuestions,
        totalCorrectes: statsJeu.totalCorrectes,
        totalIncorrectes: statsJeu.totalIncorrectes,
        tempsReponseMoyen,
        additionCorrectes: statsJeu.typeStats.addition.correctes,
        additionTotal: statsJeu.typeStats.addition.total,
        soustractionCorrectes: statsJeu.typeStats.soustraction.correctes,
        soustractionTotal: statsJeu.typeStats.soustraction.total,
        multiplicationCorrectes: statsJeu.typeStats.multiplication.correctes,
        multiplicationTotal: statsJeu.typeStats.multiplication.total,
        divisionCorrectes: statsJeu.typeStats.division.correctes,
        divisionTotal: statsJeu.typeStats.division.total,
        puissanceCorrectes: statsJeu.typeStats.puissance.correctes,
        puissanceTotal: statsJeu.typeStats.puissance.total,
        algebraCorrectes: statsJeu.typeStats.algebra.correctes,
        algebraTotal: statsJeu.typeStats.algebra.total
      });
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let tempsDebut = Date.now();

    if (estActif && tempsRestant > 0) {
      timer = setInterval(() => {
        const tempsEcoule = (Date.now() - tempsDebut) / 1000;
        const facteurRalentissement = 1 + (tempsEcoule * 0.02);

        setTempsRestant((prevTemps) => {
          const nouveauTemps = prevTemps - (3 / facteurRalentissement);
          if (nouveauTemps <= 0) {
            setEstActif(false);
            soumettreEnregistrementPartie();
          }
          return nouveauTemps;
        });
      }, tempsParNiveau());
    }
    return () => clearInterval(timer);
  }, [estActif, niveauMaxAtteint, typesProblemes, problemesReussis]);

  const soumettreRecord = useMutation({
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
    const estCorrect = checkAnswer(probleme, Number(reponse));

    // Mise à jour des statistiques pour le type de problème actuel
    setStatsJeu(prev => {
      const typeKey = probleme.type as keyof typeof prev.typeStats;
      return {
        ...prev,
        totalQuestions: prev.totalQuestions + 1,
        totalCorrectes: prev.totalCorrectes + (estCorrect ? 1 : 0),
        totalIncorrectes: prev.totalIncorrectes + (estCorrect ? 0 : 1),
        totalResponseTime: prev.totalResponseTime + ((Date.now() - debutQuestion) / 1000),
        typeStats: {
          ...prev.typeStats,
          [typeKey]: {
            correctes: prev.typeStats[typeKey].correctes + (estCorrect ? 1 : 0),
            total: prev.typeStats[typeKey].total + 1
          }
        }
      };
    });

    if (estCorrect) {
      setFeedback("correct");
      setScore(score + 10);
      setProblemesReussis(prev => prev + 1);
      setTypesProblemes(prev => new Set(prev).add(probleme.type));
      setTempsRestant(100);

      if (problemesReussis + 1 >= 5) {
        setNiveauActuel(prev => prev + 1);
        setNiveauMaxAtteint(prev => Math.max(prev, niveauActuel + 1));
        setProblemesReussis(0);
      }
    } else {
      setFeedback("incorrect");
    }

    setReponse("");
    setTimeout(() => {
      setFeedback(null);
      if (estCorrect) {
        setProbleme(generateProblem(niveauActuel));
      }
      setDebutQuestion(Date.now());
    }, 1000);
  };

  const handleRestart = () => {
    setScore(0);
    setTempsRestant(100);
    setEstActif(true);
    setProblemesReussis(0);
    setNiveauActuel(1);
    setNiveauMaxAtteint(1);
    setTypesProblemes(new Set());
    setProbleme(generateProblem(1));
    setReponse("");
    setFeedback(null);
    setDebutQuestion(Date.now());
    setStatsJeu({
      totalQuestions: 0,
      totalCorrectes: 0,
      totalIncorrectes: 0,
      startTime: Date.now(),
      totalResponseTime: 0,
      typeStats: {
        addition: { correctes: 0, total: 0 },
        soustraction: { correctes: 0, total: 0 },
        multiplication: { correctes: 0, total: 0 },
        division: { correctes: 0, total: 0 },
        puissance: { correctes: 0, total: 0 },
        algebra: { correctes: 0, total: 0 }
      }
    });
  };

  const handleStopGame = () => {
    setEstActif(false);
    soumettreEnregistrementPartie();
  };

  const handleTargetReached = () => {
    setTempsRestant(prev => Math.min(prev + 20, 100));
  };

  return (
    <div className="min-h-screen p-8 bg-background" id="game-container">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Math Runner</h1>
            <p className="text-muted-foreground">
              Niveau actuel : {niveauActuel} ({problemesReussis}/5)
            </p>
          </div>
          <div className="space-x-4">
            {!estActif && (
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
              >
                Tableau de bord
              </Button>
            )}
            {estActif && (
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
            <p className="text-sm">{Math.ceil(tempsRestant)}%</p>
          </div>
          <Progress value={tempsRestant} className="h-2" />
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

        {estActif ? (
          <>
            <Runner onTargetReached={handleTargetReached} />
            <Coach
              statsJeu={{
                statsParType: statsJeu.typeStats,
                totalCorrectes: statsJeu.totalCorrectes,
                totalIncorrectes: statsJeu.totalIncorrectes,
                tempsReponseMoyen: statsJeu.totalQuestions > 0 ?
                  statsJeu.totalResponseTime / statsJeu.totalQuestions : 0
              }}
              niveauActuel={niveauActuel}
              tempsRestant={tempsRestant}
            />
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold mb-4">{probleme.question}</p>
                    <Input
                      type="number"
                      value={reponse}
                      onChange={(e) => setReponse(e.target.value)}
                      className="text-center text-2xl"
                      placeholder="Entrez votre réponse"
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!reponse}
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
              <p className="mb-4">Niveau maximum atteint: {niveauMaxAtteint}</p>
              <Button onClick={handleRestart}>Nouvelle partie</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}