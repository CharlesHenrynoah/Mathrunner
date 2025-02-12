import html2canvas from 'html2canvas';

interface GeminiAnalysis {
  message: string;
  type: 'info' | 'warning' | 'success';
}

export async function captureAndAnalyzeScreen(): Promise<GeminiAnalysis> {
  // Pour l'instant, retourne un message par défaut
  return {
    message: "🎯 Concentrez-vous sur le jeu !",
    type: 'info'
  };
}