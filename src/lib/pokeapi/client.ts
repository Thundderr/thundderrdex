import {
  PokeAPIPokemon,
  PokeAPIPokemonList,
  PokeAPIAbility,
  PokeAPIMoveDetail,
} from "@/types/api";

const POKEAPI_BASE = "https://pokeapi.co/api/v2";

class PokeAPIError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PokeAPIError";
  }
}

async function fetchWithCache<T>(
  url: string,
  revalidate: number = 86400
): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate },
  });

  if (!response.ok) {
    throw new PokeAPIError(
      `Failed to fetch ${url}: ${response.statusText}`,
      response.status
    );
  }

  return response.json();
}

export async function fetchPokemon(
  nameOrId: string | number
): Promise<PokeAPIPokemon> {
  return fetchWithCache<PokeAPIPokemon>(
    `${POKEAPI_BASE}/pokemon/${nameOrId}`
  );
}

export async function fetchPokemonList(
  limit: number = 1025,
  offset: number = 0
): Promise<PokeAPIPokemonList> {
  return fetchWithCache<PokeAPIPokemonList>(
    `${POKEAPI_BASE}/pokemon?limit=${limit}&offset=${offset}`
  );
}

export async function fetchAbility(
  nameOrId: string | number
): Promise<PokeAPIAbility> {
  return fetchWithCache<PokeAPIAbility>(
    `${POKEAPI_BASE}/ability/${nameOrId}`
  );
}

export async function fetchMove(
  nameOrId: string | number
): Promise<PokeAPIMoveDetail> {
  return fetchWithCache<PokeAPIMoveDetail>(
    `${POKEAPI_BASE}/move/${nameOrId}`
  );
}

// Get sprite URL helper - uses raw.githubusercontent for reliability
export function getSpriteUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}

export function getOfficialArtworkUrl(pokemonId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}
