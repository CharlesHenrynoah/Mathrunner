import { Utilisateur, InsertionUtilisateur, EnregistrementPartie } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs/promises";
import path from "path";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUtilisateur(id: number): Promise<Utilisateur | undefined>;
  getUtilisateurParNom(nomUtilisateur: string): Promise<Utilisateur | undefined>;
  creerUtilisateur(utilisateur: InsertionUtilisateur): Promise<Utilisateur>;
  mettreAJourStatsUtilisateur(idUtilisateur: number, score: number, niveau: number): Promise<Utilisateur>;
  ajouterEnregistrementPartie(enregistrement: Omit<EnregistrementPartie, "id" | "dateCreation">): Promise<EnregistrementPartie>;
  getStatsUtilisateur(idUtilisateur: number): Promise<EnregistrementPartie[]>;
  getEnregistrementsPartie(idUtilisateur: number): Promise<EnregistrementPartie[]>;
  sessionStore: session.Store;
}

export class StockageJson implements IStorage {
  private dossierDonnees: string;
  sessionStore: session.Store;
  private idCourant: number;
  private idEnregistrementPartieCourant: number;

  constructor() {
    this.dossierDonnees = path.join(process.cwd(), 'donnees');
    this.assurerDossierDonnees();
    this.idCourant = this.getIdMaxCourant();
    this.idEnregistrementPartieCourant = this.getIdMaxEnregistrementPartieCourant();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  private async assurerDossierDonnees() {
    try {
      await fs.mkdir(this.dossierDonnees, { recursive: true });
    } catch (error) {
      console.error('Erreur création dossier données:', error);
    }
  }

  private getIdMaxCourant(): number {
    return 1;
  }

  private getIdMaxEnregistrementPartieCourant(): number {
    return 1;
  }

  private getCheminFichierUtilisateur(idUtilisateur: number): string {
    return path.join(this.dossierDonnees, `utilisateur_${idUtilisateur}.json`);
  }

  private getCheminFichierEnregistrementsPartie(idUtilisateur: number): string {
    return path.join(this.dossierDonnees, `parties_${idUtilisateur}.json`);
  }

  async getUtilisateur(id: number): Promise<Utilisateur | undefined> {
    try {
      const donnees = await fs.readFile(this.getCheminFichierUtilisateur(id), 'utf-8');
      return JSON.parse(donnees);
    } catch {
      return undefined;
    }
  }

  async getUtilisateurParNom(nomUtilisateur: string): Promise<Utilisateur | undefined> {
    try {
      const fichiers = await fs.readdir(this.dossierDonnees);
      for (const fichier of fichiers) {
        if (fichier.startsWith('utilisateur_')) {
          const donnees = await fs.readFile(path.join(this.dossierDonnees, fichier), 'utf-8');
          const utilisateur = JSON.parse(donnees);
          if (utilisateur.nomUtilisateur === nomUtilisateur) {
            return utilisateur;
          }
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  async creerUtilisateur(insertUtilisateur: InsertionUtilisateur): Promise<Utilisateur> {
    const id = ++this.idCourant;
    const utilisateur: Utilisateur = {
      ...insertUtilisateur,
      id,
      niveauActuel: 1,
      scoreTotal: 0,
      partiesJouees: 0,
      meilleurScore: 0
    };

    await fs.writeFile(
      this.getCheminFichierUtilisateur(id),
      JSON.stringify(utilisateur, null, 2)
    );

    await fs.writeFile(
      this.getCheminFichierEnregistrementsPartie(id),
      JSON.stringify([], null, 2)
    );

    return utilisateur;
  }

  async mettreAJourStatsUtilisateur(idUtilisateur: number, score: number, niveau: number): Promise<Utilisateur> {
    const utilisateur = await this.getUtilisateur(idUtilisateur);
    if (!utilisateur) throw new Error("Utilisateur non trouvé");

    const utilisateurMisAJour: Utilisateur = {
      ...utilisateur,
      niveauActuel: Math.max(utilisateur.niveauActuel, niveau),
      scoreTotal: utilisateur.scoreTotal + score,
      partiesJouees: utilisateur.partiesJouees + 1,
      meilleurScore: Math.max(utilisateur.meilleurScore, score)
    };

    await fs.writeFile(
      this.getCheminFichierUtilisateur(idUtilisateur),
      JSON.stringify(utilisateurMisAJour, null, 2)
    );

    return utilisateurMisAJour;
  }

  async ajouterEnregistrementPartie(enregistrement: Omit<EnregistrementPartie, "id" | "dateCreation">): Promise<EnregistrementPartie> {
    const id = ++this.idEnregistrementPartieCourant;
    const enregistrementPartie: EnregistrementPartie = {
      ...enregistrement,
      id,
      dateCreation: new Date()
    };

    const enregistrements = await this.getEnregistrementsPartie(enregistrement.idUtilisateur);
    enregistrements.push(enregistrementPartie);

    await fs.writeFile(
      this.getCheminFichierEnregistrementsPartie(enregistrement.idUtilisateur),
      JSON.stringify(enregistrements, null, 2)
    );

    return enregistrementPartie;
  }

  async getEnregistrementsPartie(idUtilisateur: number): Promise<EnregistrementPartie[]> {
    try {
      const donnees = await fs.readFile(this.getCheminFichierEnregistrementsPartie(idUtilisateur), 'utf-8');
      const enregistrements = JSON.parse(donnees);
      return enregistrements.map((enregistrement: any) => ({
        ...enregistrement,
        dateCreation: new Date(enregistrement.dateCreation)
      }));
    } catch {
      return [];
    }
  }

  async getStatsUtilisateur(idUtilisateur: number): Promise<EnregistrementPartie[]> {
    return this.getEnregistrementsPartie(idUtilisateur);
  }
}

export const stockage = new StockageJson();