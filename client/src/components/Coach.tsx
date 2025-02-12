import { useState, useEffect } from "react";
import { Brain, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface CoachProps {
  gameStats: {
    typeStats: {
      [key: string]: { correct: number; total: number };
    };
    totalCorrect: number;
    totalIncorrect: number;
    avgResponseTime: number;
  };
  currentLevel: number;
  timeLeft: number;
}

interface Tip {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success';
}

export function Coach({ gameStats, currentLevel, timeLeft }: CoachProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const generateTip = () => {
      const newTips: Tip[] = [];

      // Conseils basés sur le temps de réponse
      const avgTime = gameStats.avgResponseTime;
      if (avgTime > 5) {
        newTips.push({
          id: Date.now(),
          message: "Visualisez le problème avant de répondre.",
          type: 'info'
        });
      }

      // Conseils basés sur la précision
      const accuracy = gameStats.totalCorrect / (gameStats.totalCorrect + gameStats.totalIncorrect) * 100;
      if (accuracy < 70) {
        newTips.push({
          id: Date.now() + 1,
          message: "Prenez votre temps pour répondre. La précision est plus importante que la vitesse.",
          type: 'warning'
        });
      }

      // Conseils basés sur la barre de temps
      if (timeLeft < 30) {
        newTips.push({
          id: Date.now() + 2,
          message: "Attention, le temps diminue rapidement ! Essayez d'attraper le bonus de temps.",
          type: 'warning'
        });
      }

      // Conseils par type d'opération
      Object.entries(gameStats.typeStats).forEach(([type, stats]) => {
        if (stats.total > 0 && (stats.correct / stats.total) < 0.6) {
          newTips.push({
            id: Date.now() + 3,
            message: `Essayez de vous concentrer davantage sur les problèmes de type ${type}.`,
            type: 'info'
          });
        }
      });

      // Conseils basés sur le niveau
      if (currentLevel === 1 && gameStats.totalCorrect > 10) {
        newTips.push({
          id: Date.now() + 4,
          message: `Votre temps moyen est de ${avgTime.toFixed(1)}s. Essayez de maintenir un rythme régulier.`,
          type: 'success'
        });
      }

      if (newTips.length > 0) {
        setTips(prev => [...prev, ...newTips].slice(-3)); // Garde seulement les 3 derniers conseils
      }
    };

    const interval = setInterval(generateTip, 10000);
    generateTip();

    return () => clearInterval(interval);
  }, [gameStats, currentLevel, timeLeft]);

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsVisible(true)}
      >
        <div className="bg-purple-900 text-white p-3 rounded-full shadow-lg">
          <Brain className="h-6 w-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="p-4 max-w-md bg-purple-900 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <Brain className="h-6 w-6 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Coach Cognitif</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {tips.length > 0 ? (
                tips.map(tip => (
                  <div
                    key={tip.id}
                    className={`p-2 rounded-md ${
                      tip.type === 'warning' ? 'bg-yellow-500/20' :
                      tip.type === 'success' ? 'bg-green-500/20' :
                      'bg-blue-500/20'
                    }`}
                  >
                    <p className="text-sm">{tip.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm">Je suis là pour vous aider. Commencez à jouer !</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}