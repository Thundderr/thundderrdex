// @ts-nocheck
/**
 * Script to generate static TM/HM lookup data from PokeAPI
 *
 * Run with: npx tsx scripts/generate-tm-data.ts
 *
 * This fetches all moves that have machine data, then fetches
 * each machine to get the TM/HM number per generation.
 */

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

// Generation mapping from version groups
const VERSION_GROUP_TO_GEN: Record<string, number> = {
  "red-blue": 1,
  "yellow": 1,
  "gold-silver": 2,
  "crystal": 2,
  "ruby-sapphire": 3,
  "emerald": 3,
  "firered-leafgreen": 3,
  "diamond-pearl": 4,
  "platinum": 4,
  "heartgold-soulsilver": 4,
  "black-white": 5,
  "black-2-white-2": 5,
  "x-y": 6,
  "omega-ruby-alpha-sapphire": 6,
  "sun-moon": 7,
  "ultra-sun-ultra-moon": 7,
  "lets-go-pikachu-lets-go-eevee": 7,
  "sword-shield": 8,
  "brilliant-diamond-and-shining-pearl": 8,
  "legends-arceus": 8,
  "scarlet-violet": 9,
};

interface MoveListResponse {
  count: number;
  next: string | null;
  results: { name: string; url: string }[];
}

interface MoveDetail {
  name: string;
  machines: {
    machine: { url: string };
    version_group: { name: string };
  }[];
}

interface MachineDetail {
  item: { name: string };
  version_group: { name: string };
}

async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error("Exhausted retries");
}

function formatMachineNumber(itemName: string): string | null {
  const match = itemName.match(/^(tm|hm)(\d+)$/i);
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }
  return null;
}

async function getAllMoves(): Promise<string[]> {
  console.log("Fetching move list...");
  const moves: string[] = [];
  let url: string | null = `${POKEAPI_BASE}/move?limit=1000`;

  while (url) {
    const data = await fetchWithRetry<MoveListResponse>(url);
    moves.push(...data.results.map(m => m.name));
    url = data.next;
    console.log(`  Fetched ${moves.length} moves...`);
  }

  return moves;
}

async function main() {
  console.log("Starting TM/HM data generation...\n");

  // Structure: moveName -> generation -> TM#
  const tmLookup: Record<string, Record<number, string>> = {};

  const allMoves = await getAllMoves();
  console.log(`\nTotal moves: ${allMoves.length}\n`);

  let processed = 0;
  let movesWithMachines = 0;
  const batchSize = 10; // Process 10 moves at a time

  for (let i = 0; i < allMoves.length; i += batchSize) {
    const batch = allMoves.slice(i, i + batchSize);

    await Promise.all(batch.map(async (moveName) => {
      try {
        const moveData = await fetchWithRetry<MoveDetail>(
          `${POKEAPI_BASE}/move/${moveName}`
        );

        if (!moveData.machines || moveData.machines.length === 0) {
          return; // No TM/HM data for this move
        }

        movesWithMachines++;

        // Track which generations we've already set for this move
        const gensSeen = new Set<number>();

        // Fetch machine data for each version group
        for (const machineEntry of moveData.machines) {
          const versionGroup = machineEntry.version_group.name;
          const gen = VERSION_GROUP_TO_GEN[versionGroup];

          if (!gen || gensSeen.has(gen)) continue;

          try {
            const machineData = await fetchWithRetry<MachineDetail>(
              machineEntry.machine.url
            );

            const tmNumber = formatMachineNumber(machineData.item.name);
            if (tmNumber) {
              if (!tmLookup[moveName]) {
                tmLookup[moveName] = {};
              }
              tmLookup[moveName][gen] = tmNumber;
              gensSeen.add(gen);
            }
          } catch {
            // Skip failed machine fetches
          }
        }
      } catch {
        // Skip failed move fetches
      }
    }));

    processed += batch.length;
    if (processed % 100 === 0 || processed === allMoves.length) {
      console.log(`Processed ${processed}/${allMoves.length} moves (${movesWithMachines} have TM/HM data)`);
    }
  }

  console.log(`\nGenerating TypeScript file...`);

  // Sort moves alphabetically for consistent output
  const sortedMoves = Object.keys(tmLookup).sort();

  // Generate TypeScript file content
  let output = `// Auto-generated TM/HM lookup data
// Generated on ${new Date().toISOString()}
// Total moves with TM/HM data: ${sortedMoves.length}

/**
 * Static lookup table mapping move names to their TM/HM numbers per generation.
 * Structure: moveName -> generation -> "TM35" | "HM02"
 */
export const TM_LOOKUP: Record<string, Record<number, string>> = {\n`;

  for (const moveName of sortedMoves) {
    const gens = tmLookup[moveName];
    const genEntries = Object.entries(gens)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([gen, tm]) => `${gen}: "${tm}"`)
      .join(", ");
    output += `  "${moveName}": { ${genEntries} },\n`;
  }

  output += `};

/**
 * Get the TM/HM number for a move in a specific generation.
 * @param moveName - The move's API name (lowercase, hyphenated)
 * @param generation - The generation number (1-9)
 * @returns The TM/HM number (e.g., "TM35", "HM02") or null if not a TM/HM in that generation
 */
export function getTMNumber(moveName: string, generation: number): string | null {
  return TM_LOOKUP[moveName]?.[generation] ?? null;
}
`;

  // Write to file
  const fs = await import("fs/promises");
  const path = await import("path");
  const outputPath = path.join(__dirname, "..", "src", "data", "tmLookup.ts");

  await fs.writeFile(outputPath, output, "utf-8");

  console.log(`\nDone! Generated ${outputPath}`);
  console.log(`Total moves with TM/HM data: ${sortedMoves.length}`);
}

main().catch(console.error);
