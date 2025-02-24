import { useEffect, useState, useCallback, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface RunnerProps {
  onTargetReached: () => void;
  timeBonus?: number;
}

export function Runner({ onTargetReached, timeBonus = 13 }: RunnerProps) {
  const [runnerPos, setRunnerPos] = useState<Position>({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState<Position>({ x: 2, y: 2 });
  const targetPosRef = useRef(targetPos);
  const gridSize = 5;

  const generateNewTarget = useCallback(() => {
    const newTargetPos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
    setTargetPos(newTargetPos);
    targetPosRef.current = newTargetPos;
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

      if (newPos.x === targetPosRef.current.x && newPos.y === targetPosRef.current.y) {
        onTargetReached();
        generateNewTarget();
      }

      return newPos;
    });
  }, [onTargetReached, generateNewTarget]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex justify-center items-center min-h-[80px]">
      <div className="grid grid-cols-5 gap-0.5 w-full max-w-[150px] aspect-square bg-gray-50 p-0.5 rounded-sm shadow-sm">
        {Array.from({ length: gridSize * gridSize }).map((_, index) => {
          const x = index % gridSize;
          const y = Math.floor(index / gridSize);
          const isRunner = x === runnerPos.x && y === runnerPos.y;
          const isTarget = x === targetPos.x && y === targetPos.y;

          return (
            <div
              key={index}
              className={`aspect-square rounded-[1px] flex items-center justify-center text-base ${
                isRunner ? 'bg-blue-500' : isTarget ? 'bg-green-500' : 'bg-white'
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
    </div>
  );
}