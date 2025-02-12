import { useEffect, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface RunnerProps {
  onTargetReached: () => void;
}

export function Runner({ onTargetReached }: RunnerProps) {
  const [runnerPos, setRunnerPos] = useState<Position>({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState<Position>({ x: 2, y: 2 });
  const gridSize = 5;

  const generateRandomPositions = () => {
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
  };

  useEffect(() => {
    generateRandomPositions();

    const handleKeyDown = (e: KeyboardEvent) => {
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

        if (newPos.x === targetPos.x && newPos.y === targetPos.y) {
          onTargetReached();
          generateRandomPositions();
        }

        return newPos;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetPos]);

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
