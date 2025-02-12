import { useState, useEffect, useRef } from "react";
import { Brain, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { captureAndAnalyzeScreen } from "@/lib/screen-analysis";

interface CoachProps {
  gameStats: {
    typeStats: {
      [key: string]: { correct: number; total: number };
    };
    totalCorrect: number;
    totalIncorrect: number;
    avgResponseTime: number;
    totalQuestions: number;
  };
  currentLevel: number;
  timeLeft: number;
}

interface Tip {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: number;
}

export function Coach({ gameStats, currentLevel, timeLeft }: CoachProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [lastTipTypes, setLastTipTypes] = useState<Set<string>>(new Set());
  const analysisInterval = useRef<NodeJS.Timeout>();
  const lastAnalysisTime = useRef<number>(0);

  const COOLDOWN_TIME = 10000; // 10 secondes entre les conseils similaires
  const MAX_TIPS = 3;

  const addTip = (newTip: Omit<Tip, 'id' | 'timestamp'>) => {
    const now = Date.now();

    setTips(prev => {
      // Filtrer les conseils expirés (plus vieux que 30 secondes)
      const filteredTips = prev.filter(tip => now - tip.timestamp < 30000);

      // Vérifier si un conseil similaire existe déjà
      const hasSimilarTip = filteredTips.some(tip => 
        tip.message === newTip.message || 
        (now - tip.timestamp < COOLDOWN_TIME && tip.type === newTip.type)
      );

      if (hasSimilarTip) return filteredTips;

      const tipWithMeta = {
        ...newTip,
        id: Date.now(),
        timestamp: now
      };

      return [...filteredTips, tipWithMeta].slice(-MAX_TIPS);
    });
  };

  useEffect(() => {
    const generateTip = async () => {
      const now = Date.now();

      // Éviter les analyses trop fréquentes
      if (now - lastAnalysisTime.current < 2000) return;
      lastAnalysisTime.current = now;

      // Score de précision actuel
      const accuracy = gameStats.totalQuestions > 0 
        ? (gameStats.totalCorrect / gameStats.totalQuestions) * 100
        : 100;

      // Performances par type d'opération
      const weakestOperations = Object.entries(gameStats.typeStats)
        .filter(([_, stats]) => stats.total >= 3)
        .sort(([_, a], [__, b]) => (a.correct / a.total) - (b.correct / b.total))
        .slice(0, 2);

      // Analyse du temps de réponse
      const isResponseTimeSlow = gameStats.avgResponseTime > 5;
      const isResponseTimeFast = gameStats.avgResponseTime < 2;
      const hasHighErrorRate = gameStats.totalIncorrect > gameStats.totalCorrect * 0.3;

      // Conseils basés sur l'analyse en temps réel
      if (timeLeft < 30 && !lastTipTypes.has('time')) {
        addTip({
          message: "🏃‍♂️ Attrapez vite le bonus de temps pour ne pas perdre votre progression !",
          type: 'warning'
        });
        setLastTipTypes(prev => new Set([...prev, 'time']));
      }

      if (isResponseTimeSlow && !lastTipTypes.has('slow')) {
        addTip({
          message: "💭 Visualisez mentalement le calcul avant de répondre pour gagner en rapidité.",
          type: 'info'
        });
        setLastTipTypes(prev => new Set([...prev, 'slow']));
      }

      if (isResponseTimeFast && hasHighErrorRate && !lastTipTypes.has('fast')) {
        addTip({
          message: "⚡ Votre vitesse est impressionnante ! Prenez une fraction de seconde pour vérifier.",
          type: 'warning'
        });
        setLastTipTypes(prev => new Set([...prev, 'fast']));
      }

      // Conseils sur les types d'opérations faibles
      weakestOperations.forEach(([type, stats]) => {
        if (stats.total >= 3 && (stats.correct / stats.total) < 0.6 && !lastTipTypes.has(type)) {
          const tips = {
            addition: "➕ Décomposez les grands nombres en plus petits pour faciliter l'addition.",
            subtraction: "➖ Visualisez une ligne numérique pour mieux comprendre la soustraction.",
            multiplication: "✖️ Utilisez les tables que vous connaissez déjà comme points de repère.",
            division: "➗ Pensez à la division comme à un partage en parts égales.",
            power: "🔢 Décomposez la puissance en multiplications successives.",
            algebra: "🔤 Isolez l'inconnue en effectuant les mêmes opérations des deux côtés."
          };

          addTip({
            message: tips[type as keyof typeof tips] || `Prenez votre temps sur les ${type}.`,
            type: 'info'
          });
          setLastTipTypes(prev => new Set([...prev, type]));
        }
      });

      // Analyse d'écran via Gemini pour des conseils contextuels
      try {
        const analysis = await captureAndAnalyzeScreen();
        if (analysis.message && !lastTipTypes.has('screen')) {
          addTip(analysis);
          setLastTipTypes(prev => new Set([...prev, 'screen']));
        }
      } catch (error) {
        console.error('Failed to get screen analysis:', error);
      }

      // Réinitialiser les types de conseils après un certain temps
      setTimeout(() => {
        setLastTipTypes(new Set());
      }, COOLDOWN_TIME);
    };

    analysisInterval.current = setInterval(generateTip, 2000);
    generateTip();

    return () => {
      if (analysisInterval.current) {
        clearInterval(analysisInterval.current);
      }
    };
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
                <p className="text-sm">Concentrez-vous, je vous guide ! 🎯</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}