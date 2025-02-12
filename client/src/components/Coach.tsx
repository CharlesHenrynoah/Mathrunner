import { useState, useEffect, useRef } from "react";
import { Brain, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCoach {
  statsParType: {
    [key: string]: { correctes: number; total: number };
  };
  totalCorrectes: number;
  totalIncorrectes: number;
  tempsReponseMoyen: number;
}

interface PropsCoach {
  statsJeu: StatsCoach;
  niveauActuel: number;
  tempsRestant: number;
}

interface Conseil {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: number;
  source: 'stats' | 'temps';
}

export function Coach({ statsJeu, niveauActuel, tempsRestant }: PropsCoach) {
  const [conseils, setConseils] = useState<Conseil[]>([]);
  const [estVisible, setEstVisible] = useState(true);
  const dernierConseilTimestamps = useRef<Record<string, number>>({});

  const TEMPS_ATTENTE = {
    stats: 2000,     // 2 secondes entre les conseils basés sur les stats
    temps: 1000       // 1 seconde entre les conseils sur le temps
  };

  const ajouterConseil = (nouveauConseil: Omit<Conseil, 'id' | 'timestamp'>) => {
    const maintenant = Date.now();
    const dernierTemps = dernierConseilTimestamps.current[nouveauConseil.source] || 0;

    // Vérifier le temps d'attente par source
    if (maintenant - dernierTemps < TEMPS_ATTENTE[nouveauConseil.source]) {
      return;
    }

    setConseils(prev => {
      // Filtrer les conseils expirés (plus vieux que 10 secondes)
      const conseilsFiltres = prev.filter(conseil => maintenant - conseil.timestamp < 10000);

      // Vérifier si un conseil similaire existe déjà
      const aConseilSimilaire = conseilsFiltres.some(conseil => 
        conseil.message === nouveauConseil.message || 
        (conseil.source === nouveauConseil.source && maintenant - conseil.timestamp < TEMPS_ATTENTE[nouveauConseil.source])
      );

      if (aConseilSimilaire) return conseilsFiltres;

      // Mettre à jour le timestamp du dernier conseil de cette source
      dernierConseilTimestamps.current[nouveauConseil.source] = maintenant;

      const conseilAvecMeta = {
        ...nouveauConseil,
        id: Date.now(),
        timestamp: maintenant
      };

      // Garder uniquement les 3 derniers conseils
      return [...conseilsFiltres, conseilAvecMeta].slice(-3);
    });
  };

  useEffect(() => {
    const genererConseil = () => {
      // Conseil basé sur le temps restant (plus urgent)
      if (tempsRestant < 30) {
        const niveauUrgence = tempsRestant < 15 ? 'critique' : 'important';
        const emoji = tempsRestant < 15 ? '⚡' : '⏰';
        ajouterConseil({
          message: `${emoji} ${tempsRestant < 10 ? 'URGENT' : 'Vite'} ! ${tempsRestant.toFixed(0)}s - Bonus temps nécessaire !`,
          type: 'warning',
          source: 'temps'
        });
      }

      // Conseils basés sur les performances
      if (statsJeu.totalCorrectes + statsJeu.totalIncorrectes > 0) {
        const accelere = statsJeu.tempsReponseMoyen < 3;
        const tauxErreurEleve = statsJeu.totalIncorrectes > statsJeu.totalCorrectes * 0.3;

        if (accelere && tauxErreurEleve) {
          ajouterConseil({
            message: "🎯 Ralentissez un peu pour plus de précision !",
            type: 'warning',
            source: 'stats'
          });
        }

        // Analyse du type d'opération actuel
        const typePlusFaible = Object.entries(statsJeu.statsParType)
          .filter(([_, stats]) => stats.total >= 2)
          .sort(([_, a], [__, b]) => (a.correctes / a.total) - (b.correctes / b.total))[0];

        if (typePlusFaible && (typePlusFaible[1].correctes / typePlusFaible[1].total) < 0.7) {
          const conseils = {
            addition: "➕ Groupez les nombres !",
            soustraction: "➖ Pensez ligne numérique !",
            multiplication: "✖️ Table proche = repère !",
            division: "➗ Parts égales !",
            puissance: "🔢 Étape par étape !",
            algebre: "🔤 Isolez x !"
          };

          ajouterConseil({
            message: conseils[typePlusFaible[0] as keyof typeof conseils] || `Focus ${typePlusFaible[0]} !`,
            type: 'info',
            source: 'stats'
          });
        }
      }
    };

    const interval = setInterval(genererConseil, 300);
    genererConseil(); // Premier appel immédiat

    return () => clearInterval(interval);
  }, [statsJeu, niveauActuel, tempsRestant]);

  if (!estVisible) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={() => setEstVisible(true)}
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
                onClick={() => setEstVisible(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {conseils.length > 0 ? (
                conseils.map(conseil => (
                  <div
                    key={conseil.id}
                    className={`p-2 rounded-md animate-in fade-in slide-in-from-right-5 ${
                      conseil.type === 'warning' ? 'bg-yellow-500/20' :
                      conseil.type === 'success' ? 'bg-green-500/20' :
                      'bg-blue-500/20'
                    }`}
                  >
                    <p className="text-sm">{conseil.message}</p>
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