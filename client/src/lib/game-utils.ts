interface Problem {
  question: string;
  answer: number;
  type: string;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProblem(level: number): Problem {
  switch(level) {
    case 1: 
      return generateLevel1Problem();
    case 2: 
      return generateLevel2Problem();
    case 3: 
      return generateLevel3Problem();
    case 4: 
      return generateLevel4Problem();
    default:
      return generateLevel1Problem();
  }
}

function generateLevel1Problem(): Problem {
  const isAddition = Math.random() < 0.5;
  const a = getRandomInt(1, 10);
  const b = getRandomInt(1, 10);

  if (isAddition) {
    return {
      question: `${a} + ${b}`,
      answer: a + b,
      type: "addition"
    };
  } else {
    const bigger = Math.max(a, b);
    const smaller = Math.min(a, b);
    return {
      question: `${bigger} - ${smaller}`,
      answer: bigger - smaller,
      type: "soustraction"
    };
  }
}

function generateLevel2Problem(): Problem {
  const operation = Math.random() < 0.5 ? 
    (Math.random() < 0.5 ? "addition" : "soustraction") :
    (Math.random() < 0.5 ? "multiplication" : "division");

  switch (operation) {
    case "addition": {
      const a = getRandomInt(10, 50);
      const b = getRandomInt(10, 50);
      return {
        question: `${a} + ${b}`,
        answer: a + b,
        type: operation
      };
    }
    case "soustraction": {
      const a = getRandomInt(25, 99);
      const b = getRandomInt(1, a);
      return {
        question: `${a} - ${b}`,
        answer: a - b,
        type: operation
      };
    }
    case "multiplication": {
      const a = getRandomInt(2, 10);
      const b = getRandomInt(2, 10);
      return {
        question: `${a} × ${b}`,
        answer: a * b,
        type: operation
      };
    }
    case "division": {
      const b = getRandomInt(2, 10);
      const answer = getRandomInt(1, 10);
      const a = b * answer;
      return {
        question: `${a} ÷ ${b}`,
        answer: answer,
        type: operation
      };
    }
    default:
      return generateLevel1Problem();
  }
}

function generateLevel3Problem(): Problem {
  const operation = Math.random() < 0.5 ? 
    "multiplication" : "division";

  switch (operation) {
    case "multiplication": {
      const a = getRandomInt(5, 15);
      const b = getRandomInt(5, 15);
      return {
        question: `${a} × ${b}`,
        answer: a * b,
        type: operation
      };
    }
    case "division": {
      const b = getRandomInt(3, 12);
      const answer = getRandomInt(2, 12);
      const a = b * answer;
      return {
        question: `${a} ÷ ${b}`,
        answer: answer,
        type: operation
      };
    }
    default:
      return generateLevel2Problem();
  }
}

function generateLevel4Problem(): Problem {
  const type = "complex";
  const operations = ["+", "-", "×", "÷"];
  const op1 = operations[getRandomInt(0, 3)];
  const op2 = operations[getRandomInt(0, 3)];

  const a = getRandomInt(2, 15);
  const b = getRandomInt(2, 15);
  const c = getRandomInt(2, 10);

  let question: string;
  let answer: number;

  const useParentheses = Math.random() < 0.5;

  if (useParentheses) {
    question = `(${a} ${op1} ${b}) ${op2} ${c}`;
    const innerResult = calculateOperation(a, b, op1);
    answer = calculateOperation(innerResult, c, op2);
  } else {
    question = `${a} ${op1} ${b} ${op2} ${c}`;
    if (op1 === "×" || op1 === "÷") {
      const firstResult = calculateOperation(a, b, op1);
      answer = calculateOperation(firstResult, c, op2);
    } else {
      const secondResult = calculateOperation(b, c, op2);
      answer = calculateOperation(a, secondResult, op1);
    }
  }

  return { question, answer, type: "algebre" };
}

function calculateOperation(a: number, b: number, operation: string): number {
  switch (operation) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return Math.round(a / b); 
    default:
      return 0;
  }
}

export function checkAnswer(problem: Problem, answer: number): boolean {
  return problem.answer === answer;
}