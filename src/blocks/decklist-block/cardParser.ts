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

  constructor(cardname: string, count: number) {
    this.cardname = cardname;
    this.count = count;
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
  const isComment = value.startsWith("#") || value.startsWith("//");
  if (isComment) return new Comment(value);
  const hasCount = /(\d+) (.*)/i;
  const data = value.match(hasCount);
  if (data) {
    const count = data[1];
    const name = data[2];
    return new Card(name, parseInt(count));
  }
  return new Uncertain(value);
}
