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
    gemini: 3000,    // 3 secondes entre les conseils Gemini
    stats: 5000,     // 5 secondes entre les conseils basés sur les stats
    time: 4000       // 4 secondes entre les conseils sur le temps
  };

  const addTip = (newTip: Omit<Tip, 'id' | 'timestamp'>) => {
    const now = Date.now();
    const lastTipTime = lastTipTimestamps.current[newTip.source] || 0;

    // Vérifier le cooldown par source
    if (now - lastTipTime < COOLDOWN_TIMES[newTip.source]) {
      return;
    }

    setTips(prev => {
      // Filtrer les conseils expirés (plus vieux que 15 secondes)
      const filteredTips = prev.filter(tip => now - tip.timestamp < 15000);

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
      if (now - lastAnalysisTime.current < 500) return;
      lastAnalysisTime.current = now;

      // Analyse d'écran via Gemini pour des conseils contextuels
      try {
        const analysis = await captureAndAnalyzeScreen();
        addTip({
          ...analysis,
          source: 'gemini'
        });
      } catch (error) {
        // Si l'analyse échoue, on passe aux autres types de conseils
        console.error('Failed to get screen analysis:', error);

        // Conseil basé sur le temps restant
        if (timeLeft < 30) {
          const urgencyLevel = timeLeft < 15 ? 'critique' : 'important';
          const emoji = timeLeft < 15 ? '⚡' : '⏰';
          addTip({
            message: `${emoji} Temps ${urgencyLevel} ! Attrapez vite un bonus pour continuer !`,
            type: 'warning',
            source: 'time'
          });
        }

        // Conseils basés sur les performances récentes
        if (gameStats.totalQuestions > 0) {
          const recentAccuracy = gameStats.totalCorrect / gameStats.totalQuestions * 100;
          const isSpeedingUp = gameStats.avgResponseTime < 3;
          const hasHighErrorRate = gameStats.totalIncorrect > gameStats.totalCorrect * 0.3;

          if (isSpeedingUp && hasHighErrorRate) {
            addTip({
              message: "🎯 Bonne vitesse ! Une micro-pause pour vérifier et c'est parfait !",
              type: 'warning',
              source: 'stats'
            });
          }

          // Analyse du type d'opération actuel
          const weakestType = Object.entries(gameStats.typeStats)
            .filter(([_, stats]) => stats.total >= 2) // Réduit le seuil à 2 tentatives
            .sort(([_, a], [__, b]) => (a.correct / a.total) - (b.correct / b.total))[0];

          if (weakestType && (weakestType[1].correct / weakestType[1].total) < 0.7) {
            const tips = {
              addition: "➕ Groupez par dizaines pour aller plus vite !",
              subtraction: "➖ Visualisez la ligne des nombres !",
              multiplication: "✖️ Utilisez une table proche !",
              division: "➗ Partagez en parts égales !",
              power: "🔢 Décomposez par étapes !",
              algebra: "🔤 Isolez x des deux côtés !"
            };

            addTip({
              message: tips[weakestType[0] as keyof typeof tips] || `Focus sur les ${weakestType[0]} !`,
              type: 'info',
              source: 'stats'
            });
          }
        }
      }
    };

    const interval = setInterval(generateTip, 500); // Analyse toutes les 0.5 secondes
    generateTip(); // Premier appel immédiat

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