import html2canvas from 'html2canvas';

interface GeminiAnalysis {
  message: string;
  type: 'info' | 'warning' | 'success';
}

export async function captureAndAnalyzeScreen(): Promise<GeminiAnalysis> {
  try {
    // Capture l'écran du jeu
    const gameElement = document.getElementById('game-container');
    if (!gameElement) {
      throw new Error('Game container not found');
    }

    const canvas = await html2canvas(gameElement as HTMLElement);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Prépare les données pour Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GEMINI_API_KEY}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageData.split(',')[1]
              }
            },
            {
              text: `Analyse cette capture d'écran du jeu de mathématiques et fournis un conseil personnalisé en français.
              Concentre-toi sur:
              - Le niveau de difficulté actuel et la progression
              - Le type d'opération mathématique affiché
              - Le temps restant et l'urgence de la situation
              - L'état émotionnel suggéré par les réponses précédentes

              Sois encourageant mais direct. Utilise un ton naturel et amical.
              Limite ta réponse à 100 caractères.
              Ajoute un emoji pertinent au début de ta réponse.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid API response format');
    }

    const analysis = data.candidates[0].content.parts[0].text;

    // Détermine le type de message basé sur le contenu et la situation
    let type: 'info' | 'warning' | 'success' = 'info';

    if (analysis.toLowerCase().includes('attention') || 
        analysis.toLowerCase().includes('vite') || 
        analysis.toLowerCase().includes('urgent')) {
      type = 'warning';
    } else if (analysis.toLowerCase().includes('bravo') || 
               analysis.toLowerCase().includes('excellent') ||
               analysis.toLowerCase().includes('super')) {
      type = 'success';
    }

    return {
      message: analysis.trim(),
      type
    };
  } catch (error) {
    console.error('Error analyzing screen:', error);
    throw error; // Propager l'erreur pour la gérer dans le composant Coach
  }
}