/**
 * The known-MTG token catalogue (~70 tokens). Copied verbatim from the
 * prototype. Token names are Wizards of the Coast property (see manaSymbols.ts).
 * Tuple = [name, "P/T" or artifact type, toughness/hp].
 * hp is 1 for artifact and X/X tokens.
 */
export type TokenDef = [name: string, pt: string, hp: number]

export const TOKENS: TokenDef[] = [
  ['Treasure', 'Artifact', 1], ['Food', 'Artifact', 1], ['Clue', 'Artifact', 1], ['Blood', 'Artifact', 1], ['Gold', 'Artifact', 1],
  ['Map', 'Artifact', 1], ['Powerstone', 'Artifact', 1], ['Junk', 'Artifact', 1], ['Incubator', 'Artifact', 1],
  ['Angel', '4/4', 4], ['Bear', '2/2', 2], ['Beast', '3/3', 3], ['Bird', '1/1', 1], ['Boar', '2/2', 2], ['Cat', '1/1', 1],
  ['Centaur', '3/3', 3], ['Citizen', '1/1', 1], ['Cleric', '1/1', 1], ['Construct', '1/1', 1], ['Copy', 'X/X', 1],
  ['Demon', '5/5', 5], ['Devil', '1/1', 1], ['Dinosaur', '3/3', 3], ['Dog', '1/1', 1], ['Dragon', '5/5', 5], ['Drake', '2/2', 2],
  ['Eldrazi', '10/10', 10], ['Eldrazi Scion', '1/1', 1], ['Elemental', '3/1', 1], ['Elephant', '3/3', 3], ['Elf Warrior', '1/1', 1],
  ['Faerie', '1/1', 1], ['Frog', '1/1', 1], ['Germ', '0/0', 1], ['Goblin', '1/1', 1], ['Golem', '3/3', 3], ['Griffin', '2/2', 2],
  ['Human', '1/1', 1], ['Hydra', 'X/X', 1], ['Illusion', '1/1', 1], ['Insect', '1/1', 1], ['Knight', '2/2', 2], ['Kraken', '8/8', 8],
  ['Merfolk', '1/1', 1], ['Myr', '1/1', 1], ['Ogre', '3/3', 3], ['Ooze', '2/2', 2], ['Pegasus', '1/1', 1], ['Pest', '1/1', 1],
  ['Phyrexian Mite', '1/1', 1], ['Pirate', '1/1', 1], ['Plant', '0/1', 1], ['Rat', '1/1', 1], ['Rebel', '1/1', 1], ['Rhino', '4/4', 4],
  ['Saproling', '1/1', 1], ['Satyr', '1/1', 1], ['Servo', '1/1', 1], ['Shapeshifter', '1/1', 1], ['Sliver', '1/1', 1], ['Snake', '1/1', 1],
  ['Soldier', '1/1', 1], ['Spider', '1/2', 2], ['Spirit', '1/1', 1], ['Squirrel', '1/1', 1], ['Thopter', '1/1', 1], ['Vampire', '2/2', 2],
  ['Warrior', '1/1', 1], ['Wolf', '2/2', 2], ['Wurm', '6/6', 6], ['Zombie', '2/2', 2],
]

/** derive a token bar's base power from its catalogue tuple */
export function tokenPower(t: TokenDef): number {
  if (t[1] === 'Artifact') return 0
  const p = parseInt(t[1]) // "3/3" → 3, "3/1" → 3
  return isNaN(p) ? t[2] : p // X/X → hp (1)
}
