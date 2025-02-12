import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { stockage } from "./storage";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Récupérer tous les enregistrements de jeu de l'utilisateur
    const enregistrements = await stockage.getEnregistrementsPartie(req.user.id);

    if (!enregistrements || enregistrements.length === 0) {
      return res.json({
        meilleurScore: 0,
        scoreMoyen: 0,
        totalParties: 0,
        totalCorrectes: 0,
        totalQuestions: 0,
        totalIncorrectes: 0,
        tempsReponseMoyen: 0,
        precisionGlobale: 0,
        statsParType: {
          addition: { correctes: 0, total: 0, precision: 0 },
          soustraction: { correctes: 0, total: 0, precision: 0 },
          multiplication: { correctes: 0, total: 0, precision: 0 },
          division: { correctes: 0, total: 0, precision: 0 },
          puissance: { correctes: 0, total: 0, precision: 0 },
          algebre: { correctes: 0, total: 0, precision: 0 }
        },
        dernièrePartie: {
          score: 0,
          niveau: 0,
          correctes: 0,
          incorrectes: 0,
          tempsReponse: 0,
          meilleurType: "-"
        },
        partiesRecentes: []
      });
    }

    // Calculer les statistiques globales
    const totalParties = enregistrements.length;
    const meilleurScore = Math.max(...enregistrements.map(r => r.score));
    const scoreMoyen = Math.round(enregistrements.reduce((sum, r) => sum + r.score, 0) / totalParties);
    const totalCorrectes = enregistrements.reduce((sum, r) => sum + r.totalCorrectes, 0);
    const totalQuestions = enregistrements.reduce((sum, r) => sum + r.totalQuestions, 0);
    const totalIncorrectes = enregistrements.reduce((sum, r) => sum + r.totalIncorrectes, 0);
    const tempsReponseMoyen = Number((enregistrements.reduce((sum, r) => sum + r.tempsReponseeMoyen, 0) / totalParties).toFixed(2));
    const precisionGlobale = Math.round((totalCorrectes / totalQuestions) * 100) || 0;

    // Calculer les statistiques par type
    const statsParType = {
      addition: { correctes: 0, total: 0, precision: 0 },
      soustraction: { correctes: 0, total: 0, precision: 0 },
      multiplication: { correctes: 0, total: 0, precision: 0 },
      division: { correctes: 0, total: 0, precision: 0 },
      puissance: { correctes: 0, total: 0, precision: 0 },
      algebre: { correctes: 0, total: 0, precision: 0 }
    };

    enregistrements.forEach(enregistrement => {
      statsParType.addition.correctes += enregistrement.additionCorrectes;
      statsParType.addition.total += enregistrement.additionTotal;
      statsParType.soustraction.correctes += enregistrement.soustractionCorrectes;
      statsParType.soustraction.total += enregistrement.soustractionTotal;
      statsParType.multiplication.correctes += enregistrement.multiplicationCorrectes;
      statsParType.multiplication.total += enregistrement.multiplicationTotal;
      statsParType.division.correctes += enregistrement.divisionCorrectes;
      statsParType.division.total += enregistrement.divisionTotal;
      statsParType.puissance.correctes += enregistrement.puissanceCorrectes;
      statsParType.puissance.total += enregistrement.puissanceTotal;
      statsParType.algebre.correctes += enregistrement.algebraCorrectes;
      statsParType.algebre.total += enregistrement.algebraTotal;
    });

    // Calculer la précision pour chaque type
    Object.keys(statsParType).forEach(key => {
      const stats = statsParType[key as keyof typeof statsParType];
      stats.precision = Math.round((stats.correctes / stats.total) * 100) || 0;
    });

    // Obtenir les données de la dernière partie
    const dernierePartie = enregistrements[enregistrements.length - 1];
    const statsPartieDerniere = {
      score: dernierePartie.score,
      niveau: dernierePartie.niveau,
      correctes: dernierePartie.totalCorrectes,
      incorrectes: dernierePartie.totalIncorrectes,
      tempsReponse: Number(dernierePartie.tempsReponseeMoyen.toFixed(2)),
      meilleurType: getMeilleurType(dernierePartie)
    };

    // Récupérer les parties récentes (limitées à 10)
    const partiesRecentes = enregistrements
      .slice(-10)
      .reverse()
      .map(enregistrement => ({
        id: enregistrement.id,
        score: enregistrement.score,
        niveau: enregistrement.niveau,
        typeProbleme: enregistrement.typeProbleme,
        dateCreation: enregistrement.dateCreation.toISOString()
      }));

    res.json({
      meilleurScore,
      scoreMoyen,
      totalParties,
      totalCorrectes,
      totalQuestions,
      totalIncorrectes,
      tempsReponseMoyen,
      precisionGlobale,
      statsParType,
      dernièrePartie: statsPartieDerniere,
      partiesRecentes
    });
  });

  app.post("/api/game/record", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const {
      score,
      niveau,
      typeProbleme,
      totalQuestions,
      totalCorrectes,
      totalIncorrectes,
      tempsReponseMoyen,
      additionCorrectes,
      additionTotal,
      soustractionCorrectes,
      soustractionTotal,
      multiplicationCorrectes,
      multiplicationTotal,
      divisionCorrectes,
      divisionTotal,
      puissanceCorrectes,
      puissanceTotal,
      algebraCorrectes,
      algebraTotal
    } = req.body;

    const enregistrementPartie = await stockage.ajouterEnregistrementPartie({
      idUtilisateur: req.user.id,
      score,
      niveau,
      typeProbleme,
      totalQuestions,
      totalCorrectes,
      totalIncorrectes,
      tempsReponseeMoyen: tempsReponseMoyen,
      additionCorrectes,
      additionTotal,
      soustractionCorrectes,
      soustractionTotal,
      multiplicationCorrectes,
      multiplicationTotal,
      divisionCorrectes,
      divisionTotal,
      puissanceCorrectes,
      puissanceTotal,
      algebraCorrectes,
      algebraTotal
    });

    const utilisateurMisAJour = await stockage.mettreAJourStatsUtilisateur(req.user.id, score, niveau);
    req.login(utilisateurMisAJour, (err) => {
      if (err) return res.status(500).send(err.message);
      res.json({
        enregistrementPartie,
        niveauAugmente: false,
        nouveauNiveau: niveau
      });
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getMeilleurType(partie: any): string {
  const types = [
    { nom: 'addition', correctes: partie.additionCorrectes, total: partie.additionTotal },
    { nom: 'soustraction', correctes: partie.soustractionCorrectes, total: partie.soustractionTotal },
    { nom: 'multiplication', correctes: partie.multiplicationCorrectes, total: partie.multiplicationTotal },
    { nom: 'division', correctes: partie.divisionCorrectes, total: partie.divisionTotal },
    { nom: 'puissance', correctes: partie.puissanceCorrectes, total: partie.puissanceTotal },
    { nom: 'algebre', correctes: partie.algebraCorrectes, total: partie.algebraTotal }
  ];

  let meilleurType = '-';
  let meilleurePrecision = 0;

  types.forEach(type => {
    if (type.total > 0) {
      const precision = (type.correctes / type.total) * 100;
      if (precision > meilleurePrecision) {
        meilleurePrecision = precision;
        meilleurType = type.nom;
      }
    }
  });

  return meilleurType;
}