// Per-generation game letters and display colors, shared by the header's mobile
// GenerationSelector and the desktop GenerationRail so both render identical
// letter clusters from one source. Colors are lightened for legibility on the
// dark background; near-white letters get a text shadow at the render site.
export interface GameLetter {
  char: string;
  color: string;
  title: string;
}

export interface GenerationGames {
  gen: number;
  letters: GameLetter[];
}

export const GENERATION_CONFIG: GenerationGames[] = [
  { gen: 1, letters: [
    { char: "R", color: "#FF4444", title: "Red" },
    { char: "B", color: "#5C7CFA", title: "Blue" },
    { char: "Y", color: "#FFE066", title: "Yellow" },
  ] },
  { gen: 2, letters: [
    { char: "G", color: "#FFD700", title: "Gold" },
    { char: "S", color: "#D0D0D0", title: "Silver" },
    { char: "C", color: "#66E0FF", title: "Crystal" },
  ] },
  { gen: 3, letters: [
    { char: "R", color: "#E53935", title: "Ruby" },
    { char: "S", color: "#5C6BC0", title: "Sapphire" },
    { char: "E", color: "#66BB6A", title: "Emerald" },
  ] },
  { gen: 4, letters: [
    { char: "D", color: "#90CAF9", title: "Diamond" },
    { char: "P", color: "#F8BBD9", title: "Pearl" },
    { char: "Pt", color: "#B0B0B0", title: "Platinum" },
  ] },
  { gen: 5, letters: [
    { char: "B", color: "#78909C", title: "Black" },
    { char: "W", color: "#FAFAFA", title: "White" },
  ] },
  { gen: 6, letters: [
    { char: "X", color: "#42A5F5", title: "X" },
    { char: "Y", color: "#EF5350", title: "Y" },
  ] },
  { gen: 7, letters: [
    { char: "S", color: "#FFA726", title: "Sun" },
    { char: "M", color: "#7986CB", title: "Moon" },
  ] },
  { gen: 8, letters: [
    { char: "Sw", color: "#29B6F6", title: "Sword" },
    { char: "Sh", color: "#EC407A", title: "Shield" },
  ] },
  { gen: 9, letters: [
    { char: "S", color: "#EF5350", title: "Scarlet" },
    { char: "V", color: "#AB47BC", title: "Violet" },
  ] },
];
