interface Problem {
  question: string;
  answer: number;
  type: string;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProblem(level: number): Problem {
  const operations = [
    { type: "addition", symbol: "+", difficulty: 1 },
    { type: "subtraction", symbol: "-", difficulty: 2 },
    { type: "multiplication", symbol: "×", difficulty: 3 },
    { type: "division", symbol: "÷", difficulty: 4 }
  ];

  const availableOps = operations.filter(op => op.difficulty <= level);
  const operation = availableOps[Math.floor(Math.random() * availableOps.length)];

  let a: number, b: number, answer: number;

  switch (operation.type) {
    case "addition":
      a = getRandomInt(1, 10 * level);
      b = getRandomInt(1, 10 * level);
      answer = a + b;
      break;
    case "subtraction":
      answer = getRandomInt(1, 10 * level);
      b = getRandomInt(1, answer);
      a = answer + b;
      break;
    case "multiplication":
      a = getRandomInt(1, 5 * level);
      b = getRandomInt(1, 5 * level);
      answer = a * b;
      break;
    case "division":
      b = getRandomInt(1, 5);
      answer = getRandomInt(1, 5 * level);
      a = b * answer;
      break;
    default:
      throw new Error("Invalid operation");
  }

  return {
    question: `${a} ${operation.symbol} ${b}`,
    answer,
    type: operation.type
  };
}

export function checkAnswer(problem: Problem, answer: number): boolean {
  return problem.answer === answer;
}
