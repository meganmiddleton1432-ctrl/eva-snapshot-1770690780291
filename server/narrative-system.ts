// Persistent NarrativeSystem: Supports unique IDs, richer metadata, and structured timeline
let nextId = 0;
export class NarrativeSystem {
  constructor() {
    this.narratives = [];
  }

  addNarrativeEntry(entry, type = 'generic', timestamp = new Date(), links = [], meta = {}) {
    const id = nextId++;
    this.narratives.push({ id, entry, type, timestamp, links, meta });
    return id;
  }

  getFullNarrative() {
    return this.narratives
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(e => `[${e.timestamp.toISOString()}][${e.type}][ID:${e.id}] ${e.entry}`)
      .join('\n');
  }

  getNarrativesByType(type) {
    return this.narratives.filter(e => e.type === type);
  }

  linkEntries(idA, idB) {
    const entryA = this.narratives.find(e => e.id === idA);
    const entryB = this.narratives.find(e => e.id === idB);
    if (entryA && entryB) {
      entryA.links.push(idB);
      entryB.links.push(idA);
    }
  }

  getNarrativeTimeline() {
    // Returns the narratives as a structured chronological timeline
    return this.narratives.slice().sort((a, b) => a.timestamp - b.timestamp);
  }

  findNarrativeById(id) {
    return this.narratives.find(e => e.id === id);
  }
}
