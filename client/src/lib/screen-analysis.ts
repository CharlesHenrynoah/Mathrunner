import html2canvas from 'html2canvas';

interface GeminiAnalysis {
  message: string;
  type: 'info' | 'warning' | 'success';
}

export async function captureAndAnalyzeScreen(): Promise<GeminiAnalysis> {
  try {
    // Capture l'écran du jeu
    const gameElement = document.querySelector('#game-container');
    if (!gameElement) {
      throw new Error('Game container not found');
    }

    const canvas = await html2canvas(gameElement);
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
              text: "Analyze this math game screenshot and provide a short coaching tip in French. Focus on the player's performance, time management, and current game state. Keep the response under 100 characters."
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const analysis = data.candidates[0].content.parts[0].text;

    // Détermine le type de message basé sur le contenu
    const type = analysis.toLowerCase().includes('attention') || analysis.toLowerCase().includes('attention') 
      ? 'warning'
      : analysis.toLowerCase().includes('bravo') || analysis.toLowerCase().includes('excellent')
      ? 'success'
      : 'info';

    return {
      message: analysis,
      type
    };
  } catch (error) {
    console.error('Error analyzing screen:', error);
    return {
      message: "Concentrez-vous sur votre rythme et votre précision.",
      type: 'info'
    };
  }
}
