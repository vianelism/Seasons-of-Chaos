const APPROVAL_PHRASES = [
  "The passport office has approved this nonsense.",
  "Another completely prestigious achievement has been unlocked.",
  "Officially documented for absolutely no important reason.",
  "Mom chaos recognized. Achievement unlocked.",
  "The paperwork is suspiciously complete.",
  "The seasonal authorities have reviewed the evidence and said, ‘sure.’",
  "Filed under: things worth bragging about for no practical reason.",
  "The council of cozy chaos has spoken.",
  "This achievement is now legally imaginary and emotionally binding.",
  "A tiny ceremonial stamp has entered the chat.",
  "The records department is impressed, confused, and supportive.",
  "Chaos confirmed. Documentation secured.",
] as const;

export function approvalPhrase(preferred?: string): string {
  const choices = preferred ? [preferred, ...APPROVAL_PHRASES] : APPROVAL_PHRASES;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return choices[random[0]! % choices.length]!;
}

export { APPROVAL_PHRASES };
