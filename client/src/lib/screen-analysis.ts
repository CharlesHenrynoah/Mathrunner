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

    const canvas = await html2canvas(gameElement);
    const imageData = canvas.toDataURL('image/jpeg', 0.5); // Réduit la qualité pour diminuer la taille

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
      console.error('Gemini API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data); // Debug log

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
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
    console.error('Error analyzing screen:', error);
    throw error;
  }
}