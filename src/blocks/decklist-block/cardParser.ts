class Comment {
  readonly kind = "comment";
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

class Card {
  readonly kind = "card";
  readonly cardname: string;
  readonly count: number;
  readonly setcode?: string;
  readonly collectorNumber?: string;

  constructor(
    cardname: string,
    count: number,
    setcode?: string,
    collectorNumber?: string
  ) {
    this.cardname = cardname;
    this.count = count;
    this.setcode = setcode;
    this.collectorNumber = collectorNumber;
  }
}

class Uncertain {
  readonly kind = "uncertain";
  readonly line: string;

  constructor(value: string) {
    this.line = value;
  }
}

type ParsedLine = Comment | Card | Uncertain;

export function parseLine(value: string): ParsedLine {
  const isComment =
    value.trimStart().startsWith("#") || value.trimStart().startsWith("//");
  if (isComment) return new Comment(value);

  const hasCount = /(?<count>\d+) (?<name>.*)/i;
  const data = value.match(hasCount);
  if (data && data.groups) {
    const count = data.groups.count || "1";
    const name = data.groups.name || undefined;
    if (name === undefined) {
      throw "could not parse a cardname";
    }
    return new Card(name, parseInt(count));
  }

  return new Uncertain(value);
}
