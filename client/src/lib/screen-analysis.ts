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

    // Configuration spécifique pour html2canvas
    const canvas = await html2canvas(gameElement, {
      logging: false, // Désactive les logs internes
      useCORS: true, // Active CORS pour les images externes
      scale: 1, // Échelle réduite pour diminuer la taille
      backgroundColor: null // Garde la transparence
    });

    // Convertit en PNG pour une meilleure compatibilité
    const imageData = canvas.toDataURL('image/png', 0.5);

    // Vérifie la taille de l'image
    const imageSize = Math.round((imageData.length - 22) * 3 / 4);
    console.log(`Image size: ${imageSize} bytes`);

    // Prépare les données pour Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
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
                mimeType: "image/png",
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
              Limite ta réponse à 50 caractères maximum.
              Ajoute un emoji pertinent au début de ta réponse.`
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error details:', errorData);
      throw new Error(`API error ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response format');
    }

    const analysis = data.candidates[0].content.parts[0].text;

    // Détermine le type de message basé sur le contenu
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
    console.error('Error in captureAndAnalyzeScreen:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}