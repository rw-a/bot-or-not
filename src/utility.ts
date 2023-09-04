import seedrandom from 'seedrandom';

export function generateID(len?: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < (len || 40); i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

export function shuffleArray(array: any[], seed: string = "nice") {
  const pseudoRandom = seedrandom(seed);
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(pseudoRandom() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
}