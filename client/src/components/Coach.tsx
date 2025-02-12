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
  source: 'gemini' | 'stats' | 'time';
}

export function Coach({ gameStats, currentLevel, timeLeft }: CoachProps) {
  const [tips, setTips] = useState<Tip[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const lastTipTimestamps = useRef<Record<string, number>>({});
  const lastAnalysisTime = useRef<number>(0);

  const COOLDOWN_TIMES = {
    gemini: 8000,   // 8 secondes entre les conseils Gemini
    stats: 15000,   // 15 secondes entre les conseils basés sur les stats
    time: 10000     // 10 secondes entre les conseils sur le temps
  };

  const addTip = (newTip: Omit<Tip, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const lastTipTime = lastTipTimestamps.current[newTip.source] || 0;

    // Vérifier le cooldown par source
    if (now - lastTipTime < COOLDOWN_TIMES[newTip.source]) {
      return;
    }

    setTips(prev => {
      // Filtrer les conseils expirés (plus vieux que 30 secondes)
      const filteredTips = prev.filter(tip => now - tip.timestamp < 30000);

      // Vérifier si un conseil similaire existe déjà
      const hasSimilarTip = filteredTips.some(tip => 
        tip.message === newTip.message || 
        (tip.source === newTip.source && now - tip.timestamp < COOLDOWN_TIMES[newTip.source])
      );

      if (hasSimilarTip) return filteredTips;

      // Mettre à jour le timestamp du dernier conseil de cette source
      lastTipTimestamps.current[newTip.source] = now;

      const tipWithMeta = {
        ...newTip,
        id: Date.now(),
        timestamp: now
      };

      // Garder uniquement les 3 derniers conseils
      return [...filteredTips, tipWithMeta].slice(-3);
    });
  };

  useEffect(() => {
    const generateTip = async () => {
      const now = Date.now();

      // Éviter les analyses trop fréquentes
      if (now - lastAnalysisTime.current < 2000) return;
      lastAnalysisTime.current = now;

      // Conseil basé sur le temps restant
      if (timeLeft < 30) {
        const urgencyLevel = timeLeft < 15 ? 'critique' : 'important';
        const emoji = timeLeft < 15 ? '⚡' : '⏰';
        addTip({
          message: `${emoji} Temps ${urgencyLevel} ! Attrapez vite un bonus pour continuer votre progression !`,
          type: 'warning',
          source: 'time'
        });
      }

      // Conseils basés sur les performances
      if (gameStats.totalQuestions >= 5) {
        const recentAccuracy = gameStats.totalCorrect / gameStats.totalQuestions * 100;
        const isSpeedingUp = gameStats.avgResponseTime < 3;
        const hasHighErrorRate = gameStats.totalIncorrect > gameStats.totalCorrect * 0.3;

        if (isSpeedingUp && hasHighErrorRate) {
          addTip({
            message: "🎯 Super vitesse, mais prenez une micro-pause pour vérifier. La précision est clé !",
            type: 'warning',
            source: 'stats'
          });
        }

        // Analyse des points faibles
        const weakestType = Object.entries(gameStats.typeStats)
          .filter(([_, stats]) => stats.total >= 3)
          .sort(([_, a], [__, b]) => (a.correct / a.total) - (b.correct / b.total))[0];

        if (weakestType && (weakestType[1].correct / weakestType[1].total) < 0.6) {
          const tips = {
            addition: "➕ Astuce : groupez les chiffres par dizaines pour additionner plus vite !",
            subtraction: "➖ Visualisez une ligne de nombres pour mieux soustraire.",
            multiplication: "✖️ Utilisez les tables proches que vous connaissez bien !",
            division: "➗ Pensez à la division comme un partage équitable.",
            power: "🔢 Décomposez étape par étape pour les puissances.",
            algebra: "🔤 Isolez x en faisant la même chose des deux côtés !"
          };

          addTip({
            message: tips[weakestType[0] as keyof typeof tips] || `Concentrez-vous sur les ${weakestType[0]}.`,
            type: 'info',
            source: 'stats'
          });
        }
      }

      // Analyse d'écran via Gemini pour des conseils contextuels
      try {
        const analysis = await captureAndAnalyzeScreen();
        addTip({
          ...analysis,
          source: 'gemini'
        });
      } catch (error) {
        // Si l'analyse échoue, on continue silencieusement
        console.error('Failed to get screen analysis:', error);
      }
    };

    const interval = setInterval(generateTip, 2000);
    generateTip();

    return () => clearInterval(interval);
  }, [gameStats, currentLevel, timeLeft]);

  if (!isVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setIsVisible(true)}
      >
        <div className="bg-purple-900 text-white p-3 rounded-full shadow-lg hover:bg-purple-800 transition-colors">
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
              <h3 className="font-semibold">Coach Personnel</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {tips.length > 0 ? (
                tips.map(tip => (
                  <div
                    key={tip.id}
                    className={`p-2 rounded-md animate-in fade-in slide-in-from-right-5 ${
                      tip.type === 'warning' ? 'bg-yellow-500/20' :
                      tip.type === 'success' ? 'bg-green-500/20' :
                      'bg-blue-500/20'
                    }`}
                  >
                    <p className="text-sm">{tip.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm">Je suis là pour vous guider, concentrez-vous ! 🎯</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}