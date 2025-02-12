import { useEffect, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface RunnerProps {
  onTargetReached: () => void;
  timeBonus?: number;
}

export function Runner({ onTargetReached, timeBonus = 20 }: RunnerProps) {
  const [runnerPos, setRunnerPos] = useState<Position>({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState<Position>({ x: 2, y: 2 });
  const gridSize = 5;

  const generateRandomPositions = useCallback(() => {
    const newRunnerPos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };

    let newTargetPos;
    do {
      newTargetPos = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
      };
    } while (newTargetPos.x === newRunnerPos.x && newTargetPos.y === newRunnerPos.y);

    setRunnerPos(newRunnerPos);
    setTargetPos(newTargetPos);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setRunnerPos(prev => {
      let newPos = { ...prev };

      switch (e.key) {
        case 'ArrowUp':
          if (prev.y > 0) newPos.y = prev.y - 1;
          break;
        case 'ArrowDown':
          if (prev.y < gridSize - 1) newPos.y = prev.y + 1;
          break;
        case 'ArrowLeft':
          if (prev.x > 0) newPos.x = prev.x - 1;
          break;
        case 'ArrowRight':
          if (prev.x < gridSize - 1) newPos.x = prev.x + 1;
          break;
      }

      // Vérifier si la cible est atteinte après le mouvement
      if (newPos.x === targetPos.x && newPos.y === targetPos.y) {
        onTargetReached(); // Appel du callback pour augmenter le temps
        setTimeout(() => generateRandomPositions(), 100); // Générer de nouvelles positions avec un léger délai
      }

      return newPos;
    });
  }, [targetPos, onTargetReached, generateRandomPositions]);

  useEffect(() => {
    // Générer les positions initiales au montage
    generateRandomPositions();

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, generateRandomPositions]); // Dépendances stables grâce à useCallback

  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-md mx-auto mb-4">
      {Array.from({ length: gridSize * gridSize }).map((_, index) => {
        const x = index % gridSize;
        const y = Math.floor(index / gridSize);
        const isRunner = x === runnerPos.x && y === runnerPos.y;
        const isTarget = x === targetPos.x && y === targetPos.y;

        return (
          <div
            key={index}
            className={`aspect-square rounded-lg ${
              isRunner ? 'bg-blue-500' : isTarget ? 'bg-green-500' : 'bg-gray-100'
            }`}
          >
            {isRunner && (
              <div className="w-full h-full flex items-center justify-center">
                🏃
              </div>
            )}
            {isTarget && !isRunner && (
              <div className="w-full h-full flex items-center justify-center">
                🎯
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}