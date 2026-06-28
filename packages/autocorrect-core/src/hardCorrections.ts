/**
 * A curated map of common English misspellings to their correction. These are
 * applied with high confidence (still respecting user rejections and unsafe
 * fields) so the most frequent typos always get fixed, regardless of what the
 * frequency list or validator contains. Every key is a non-word, so it never
 * collides with correctly-spelled input.
 */
export interface HardCorrections {
  correctionFor(word: string): string | null;
}

export function createHardCorrections(
  map: Readonly<Record<string, string>>,
): HardCorrections {
  const lower = new Map<string, string>();
  for (const [misspelling, correction] of Object.entries(map)) {
    lower.set(misspelling.toLowerCase(), correction);
  }
  return {
    correctionFor: (word) => lower.get(word.toLowerCase()) ?? null,
  };
}

const COMMON_MISSPELLINGS: Record<string, string> = {
  teh: "the",
  adn: "and",
  hte: "the",
  thsi: "this",
  taht: "that",
  alot: "a lot",
  abt: "about",
  recieve: "receive",
  recieved: "received",
  recieving: "receiving",
  beleive: "believe",
  beleived: "believed",
  seperate: "separate",
  seperated: "separated",
  seperately: "separately",
  definately: "definitely",
  defiantly: "definitely",
  occured: "occurred",
  occuring: "occurring",
  occurence: "occurrence",
  untill: "until",
  wich: "which",
  thier: "their",
  becuase: "because",
  becasue: "because",
  alway: "always",
  allways: "always",
  wierd: "weird",
  freind: "friend",
  freinds: "friends",
  goverment: "government",
  enviroment: "environment",
  neccessary: "necessary",
  necesary: "necessary",
  accross: "across",
  agressive: "aggressive",
  apparant: "apparent",
  arguement: "argument",
  calender: "calendar",
  cemetary: "cemetery",
  collegue: "colleague",
  comming: "coming",
  commited: "committed",
  completly: "completely",
  concious: "conscious",
  embarass: "embarrass",
  enviornment: "environment",
  existance: "existence",
  experiance: "experience",
  familar: "familiar",
  finaly: "finally",
  foriegn: "foreign",
  fourty: "forty",
  gaurd: "guard",
  grammer: "grammar",
  happend: "happened",
  immediatly: "immediately",
  independant: "independent",
  knowlege: "knowledge",
  liason: "liaison",
  libary: "library",
  maintainance: "maintenance",
  mispell: "misspell",
  noticable: "noticeable",
  occassion: "occasion",
  persistant: "persistent",
  posession: "possession",
  prefered: "preferred",
  privelege: "privilege",
  probaly: "probably",
  publically: "publicly",
  reccomend: "recommend",
  refered: "referred",
  relevent: "relevant",
  rythm: "rhythm",
  succesful: "successful",
  supercede: "supersede",
  suprise: "surprise",
  tommorow: "tomorrow",
  truely: "truly",
  unfortunatly: "unfortunately",
  usefull: "useful",
  wether: "whether",
};

export function createCommonHardCorrections(): HardCorrections {
  return createHardCorrections(COMMON_MISSPELLINGS);
}
