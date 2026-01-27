// PokeAPI response types

export interface PokeAPIPokemon {
  id: number;
  name: string;
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
