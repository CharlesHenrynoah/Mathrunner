import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
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
}

export function Coach({ gameStats, currentLevel }: CoachProps) {
  const [tip, setTip] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const generateTip = () => {
      const tips = [];

      // Conseils basés sur le temps de réponse
      const avgTime = gameStats.totalCorrect > 0 ? gameStats.avgResponseTime / gameStats.totalCorrect : 0;
      if (avgTime > 5) {
        tips.push("Visualisez le problème avant de répondre.");
      }

      // Conseils basés sur la précision
      const accuracy = gameStats.totalCorrect / (gameStats.totalCorrect + gameStats.totalIncorrect) * 100;
      if (accuracy < 70) {
        tips.push("Prenez votre temps pour répondre. La précision est plus importante que la vitesse.");
      }

      // Conseils par type d'opération
      Object.entries(gameStats.typeStats).forEach(([type, stats]) => {
        if (stats.total > 0 && (stats.correct / stats.total) < 0.6) {
          tips.push(`Essayez de vous concentrer davantage sur les problèmes de type ${type}.`);
        }
      });

      // Conseils basés sur le niveau
      if (currentLevel === 1 && gameStats.totalCorrect > 10) {
        tips.push("Votre temps moyen est de 0.0s. Essayez de maintenir un rythme régulier.");
      }

      if (tips.length > 0) {
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        setTip(randomTip);
        setIsVisible(true);
        
        // Cache le conseil après 5 secondes
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      }
    };

    generateTip();
  }, [gameStats, currentLevel]);

  if (!isVisible || !tip) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
      <Card className="p-4 max-w-md bg-purple-900 text-white">
        <div className="flex items-start gap-3">
          <Brain className="h-6 w-6 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Coach Cognitif</h3>
            <p className="text-sm">{tip}</p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="ml-auto p-1 hover:opacity-70"
          >
            ✕
          </button>
        </div>
      </Card>
    </div>
  );
}
