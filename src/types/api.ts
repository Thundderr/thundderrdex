// PokeAPI response types

export interface PokeAPIPokemon {
  id: number;
  name: string;
  weight: number; // hectograms
  types: {
    slot: number;
    type: {
      name: string;
      url: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
      url: string;
    };
  }[];
  abilities: {
    ability: {
      name: string;
      url: string;
    };
    is_hidden: boolean;
    slot: number;
  }[];
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
  moves: PokeAPIMove[];
  // Generation-specific data
  past_types: {
    generation: {
      name: string;
      url: string;
    };
    types: {
      slot: number;
      type: {
        name: string;
        url: string;
      };
    }[];
  }[];
  past_abilities: {
    generation: {
      name: string;
      url: string;
    };
    abilities: {
      ability: {
        name: string;
        url: string;
      } | null;
      is_hidden: boolean;
      slot: number;
    }[];
  }[];
}

export interface PokeAPIMove {
  move: {
    name: string;
    url: string;
  };
  version_group_details: {
    level_learned_at: number;
    move_learn_method: {
      name: string;
      url: string;
    };
    version_group: {
      name: string;
      url: string;
    };
  }[];
}

export interface PokeAPIMoveDetail {
  id: number;
  name: string;
  type: {
    name: string;
  };
  damage_class: {
    name: string;
  };
  power: number | null;
  accuracy: number | null;
  pp: number;
  priority: number;
  effect_chance: number | null;
  effect_entries: {
    effect: string;
    short_effect: string;
    language: {
      name: string;
    };
  }[];
  machines: {
    machine: {
      url: string;
    };
    version_group: {
      name: string;
      url: string;
    };
  }[];
}

export interface PokeAPIAbility {
  id: number;
  name: string;
  effect_entries: {
    effect: string;
    short_effect: string;
    language: {
      name: string;
    };
  }[];
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
}

export interface PokeAPIPokemonList {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    name: string;
    url: string;
  }[];
}

export interface PokeAPIMachine {
  id: number;
  item: {
    name: string;
    url: string;
  };
  move: {
    name: string;
    url: string;
  };
  version_group: {
    name: string;
    url: string;
  };
}

// Encounter API types
export interface PokeAPIEncounterDetail {
  chance: number;
  condition_values: {
    name: string;
    url: string;
  }[];
  max_level: number;
  min_level: number;
  method: {
    name: string;
    url: string;
  };
}

export interface PokeAPIVersionEncounter {
  encounter_details: PokeAPIEncounterDetail[];
  max_chance: number;
  version: {
    name: string;
    url: string;
  };
}

export interface PokeAPILocationEncounter {
  location_area: {
    name: string;
    url: string;
  };
  version_details: PokeAPIVersionEncounter[];
}

// Location Area types (for fetching Pokemon at a location)
export interface PokeAPILocationAreaPokemonEncounter {
  pokemon: {
    name: string;
    url: string;
  };
  version_details: {
    max_chance: number;
    version: {
      name: string;
      url: string;
    };
    encounter_details: PokeAPIEncounterDetail[];
  }[];
}

export interface PokeAPILocationArea {
  id: number;
  name: string;
  game_index: number;
  location: {
    name: string;
    url: string;
  };
  names: {
    name: string;
    language: {
      name: string;
      url: string;
    };
  }[];
  encounter_method_rates: {
    encounter_method: {
      name: string;
      url: string;
    };
    version_details: {
      rate: number;
      version: {
        name: string;
        url: string;
      };
    }[];
  }[];
  pokemon_encounters: PokeAPILocationAreaPokemonEncounter[];
}

export interface PokeAPILocation {
  id: number;
  name: string;
  region: {
    name: string;
    url: string;
  } | null;
  names: {
    name: string;
    language: {
      name: string;
      url: string;
    };
  }[];
  game_indices: {
    game_index: number;
    generation: {
      name: string;
      url: string;
    };
  }[];
  areas: {
    name: string;
    url: string;
  }[];
}

export interface PokeAPILocationList {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    name: string;
    url: string;
  }[];
}

export interface PokeAPILocationAreaList {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    name: string;
    url: string;
  }[];
}

// Pokemon Species (for evolution chain)
export interface PokeAPIPokemonSpecies {
  id: number;
  name: string;
  capture_rate: number; // 0-255 base catch rate
  gender_rate: number; // -1 genderless, else eighths female
  evolution_chain: {
    url: string;
  } | null;
  evolves_from_species: {
    name: string;
    url: string;
  } | null;
}

// Evolution Chain
export interface PokeAPIEvolutionDetail {
  trigger: {
    name: string;
    url: string;
  };
  min_level: number | null;
  item: { name: string; url: string } | null;
  held_item: { name: string; url: string } | null;
  known_move: { name: string; url: string } | null;
  known_move_type: { name: string; url: string } | null;
  min_happiness: number | null;
  min_beauty: number | null;
  min_affection: number | null;
  time_of_day: string;
  location: { name: string; url: string } | null;
  gender: number | null;
  relative_physical_stats: number | null;
  party_species: { name: string; url: string } | null;
  party_type: { name: string; url: string } | null;
  trade_species: { name: string; url: string } | null;
  needs_overworld_rain: boolean;
  turn_upside_down: boolean;
}

export interface PokeAPIEvolutionChainLink {
  species: {
    name: string;
    url: string;
  };
  evolution_details: PokeAPIEvolutionDetail[];
  evolves_to: PokeAPIEvolutionChainLink[];
}

export interface PokeAPIEvolutionChain {
  id: number;
  chain: PokeAPIEvolutionChainLink;
}

// Pokedex (regional dex) types
export interface PokeAPIPokedexEntry {
  entry_number: number;
  pokemon_species: {
    name: string;
    url: string;
  };
}

export interface PokeAPIPokedex {
  id: number;
  name: string;
  is_main_series: boolean;
  region: { name: string; url: string } | null;
  pokemon_entries: PokeAPIPokedexEntry[];
}
