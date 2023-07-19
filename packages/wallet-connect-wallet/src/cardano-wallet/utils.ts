import { generateMnemonic } from 'bip39';

export function generateSeed() {
  return generateMnemonic(256);
}

export const harden = (num: number): number => 0x80000000 + num;
