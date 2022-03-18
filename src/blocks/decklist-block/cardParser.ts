interface CommentLine {
  kind: "comment";
  value: string;
}

function commentLine(value: string): CommentLine {
  return {
    kind: "comment",
    value: value,
  };
}

interface CardLine {
  kind: "card";
  cardname: string;
  count: number;
  setcode?: string;
  collectorNumber?: string;
}

function cardLine(cardname: string, count: number): CardLine {
  return {
    kind: "card",
    cardname: cardname,
    count: count,
  };
}

interface UncertainLine {
  kind: "uncertain";
  line: string;
}

function uncertainLine(line: string): UncertainLine {
  return {
    kind: "uncertain",
    line: line,
  };
}

interface BlankLine {
  kind: "blank";
}

function blankLine(): BlankLine {
  return {
    kind: "blank",
  };
}

type ParsedLine = CommentLine | CardLine | UncertainLine | BlankLine;

/////// Grammar ///////

/* EBNF for a card line:
 *
 * line = cardspec | comment
 * cardspec = num SP cardname
 *          | num SP '[' setcode '#' collectornum ']' SP cardname
 *          | num 'x' SP cardname '(' setcode ')' (SP foil)? (SP tags)? (SP earcolor)?
 * SP = \s
 * num = [1-9][0-9]*
 * setcode = [A-Z0-9]{3,4} | [a-z0-9]{3,4}
 * collectornum = num
 * foil = '*F*'
 * tags = '[' [^]]* ']'
 * earcolor = '^' [^^]* '^'
 * comment = ('#' | '//') .*
 * cardname = [^([#]+
 *
 * at time of writing, 5 silver-border cards and 24 non-playable pieces
 * have a "(" in their name. i'm OK excluding these for now. no cards
 * in Scryfall have a "[" or "#".
 */

export function parseLine(text: string): ParsedLine {
  if (text.trim() === "") return blankLine();
  const res = line({ text, index: 0 });
  if (res.success) return res.value;

  console.error(
    `Parse error, expected ${res.expected} at char ${res.ctx.index} ("${text}")`
  );
  return uncertainLine(text);
}

// line = cardspec | comment
function line(ctx: Context): Result<CommentLine | CardLine> {
  return any<CardLine | CommentLine>([cardspec, comment])(ctx);
}

// comment = ('#' | '//') .*
const comment = map(
  sequence<string>([
    any<string>([str("#"), str("//")]),
    regex(/.*/g, "comment"),
  ]),
  ([lead, rest]): CommentLine => commentLine(lead + rest)
);

function cardspec(ctx: Context): Result<CardLine> {
  return any<CardLine>([cardspec1, cardspec2, cardspec3])(ctx);
}

// cardname = [^([#]+
const cardname = regex(/[^\(\[\#]+/g, "card name");

// SP = \s
const space = regex(/\s/gu, "whitespace");

// num = [1-9][0-9]*
const num = map(regex(/\d+/g, "number"), parseInt);

// setcode = [A-Z0-9]{3,4} | [a-z0-9]{3,4}
const setcode = regex(/[A-Z0-9]{3,4}/gi, "set code");

// for now, reuse "num", but I suspect there are other formats
// to handle in the future
// collectornum = num
const collectornum = num;

// foil = '*F*'
const foil = str("*F*");

// tags = '[' [^]]* ']'
// (brackets surrounding anything not a bracket)
const tags = regex(/\/[^]]*\//g, "tag list");

// earcolor = '^' [^^]* '^'
// (carets surrounding anything not a caret)
const earcolor = regex(/^[^^]^/g, "ear color list");

// cardspec = num SP cardname
const cardspec1 = map(
  sequence<string | number>([num, space, cardname]),
  ([count, ws, cardname]): CardLine =>
    cardLine(cardname as string, count as number)
);

// cardspec = num SP '[' setcode '#' collectornum ']' SP cardname
const cardspec2 = map(
  sequence<string | number>([
    num,
    space,
    str("["),
    setcode,
    str("#"),
    collectornum,
    str("]"),
    space,
    cardname,
  ]),
  ([
    count,
    _ws1,
    _lbrkt,
    _setcode,
    _octothorpe,
    _collnum,
    _rbrkt,
    _ws2,
    cardname,
  ]): CardLine => cardLine(cardname as string, count as number)
);

// cardspec = num 'x' SP cardname '(' setcode ')' (SP foil)? (SP tags)? (SP earcolor)?
// but for now don't bother parsing past the "(setcode)" part
const cardspec3 = map(
  sequence<string | number>([
    num,
    str("x"),
    space,
    cardname,
    // cardname eats the space that would be here
    str("("),
    setcode,
    str(")"),
    regex(/.*/g, "rest of line"),
  ]),
  ([count, _x, _ws, cardname, _lparen, _setcode, _rparen, _rest]): CardLine =>
    cardLine(cardname as string, count as number)
);

/////// Parser ////////
// thank you https://www.sigmacomputing.com/blog/writing-a-parser-combinator-from-scratch-in-typescript/
// for refreshing my memory on parser combinators
type Parser<T> = (ctx: Context) => Result<T>;
type Context = Readonly<{
  text: string; // full line
  index: number; // current position
}>;
type Result<T> = Success<T> | Failure;
type Success<T> = Readonly<{
  success: true;
  value: T;
  ctx: Context;
}>;
type Failure = Readonly<{
  success: false;
  expected: string;
  ctx: Context;
}>;

function success<T>(ctx: Context, value: T): Success<T> {
  return { success: true, value, ctx };
}
function failure(ctx: Context, expected: string): Failure {
  return { success: false, expected, ctx };
}

function str(match: string): Parser<string> {
  return (ctx) => {
    const endIdx = ctx.index + match.length;
    if (ctx.text.substring(ctx.index, endIdx) === match) {
      return success({ ...ctx, index: endIdx }, match);
    } else {
      return failure(ctx, match);
    }
  };
}

function regex(re: RegExp, expected: string): Parser<string> {
  return (ctx) => {
    re.lastIndex = ctx.index;
    const res = re.exec(ctx.text);
    if (res && res.index === ctx.index) {
      return success({ ...ctx, index: ctx.index + res[0].length }, res[0]);
    } else {
      return failure(ctx, expected);
    }
  };
}

function sequence<T>(parsers: Parser<T>[]): Parser<T[]> {
  return (ctx) => {
    //console.log(`sequence<T> for "${ctx.text}"@${ctx.index}`);
    let values: T[] = [];
    let nextCtx = ctx;
    for (const parser of parsers) {
      const res = parser(nextCtx);
      //console.log(res);
      if (!res.success) return res;
      values.push(res.value);
      nextCtx = res.ctx;
    }
    return success(nextCtx, values);
  };
}

function any<T>(parsers: Parser<T>[]): Parser<T> {
  return (ctx) => {
    //console.log(`any<T> for "${ctx.text}"@${ctx.index}`);
    let furthestRes: Result<T> | null = null;
    for (const parser of parsers) {
      const res = parser(ctx);
      //console.log(res);
      if (res.success) return res;
      if (!furthestRes || furthestRes.ctx.index < res.ctx.index)
        furthestRes = res;
    }
    return furthestRes!;
  };
}

function optional<T>(parser: Parser<T>): Parser<T | null> {
  return any([parser, (ctx) => success(ctx, null)]);
}

function many<T>(parser: Parser<T>): Parser<T[]> {
  return (ctx) => {
    let values: T[] = [];
    let nextCtx = ctx;
    while (true) {
      const res = parser(nextCtx);
      if (!res.success) break;
      values.push(res.value);
      nextCtx = res.ctx;
    }
    return success(nextCtx, values);
  };
}

function map<A, B>(parser: Parser<A>, fn: (val: A) => B): Parser<B> {
  return (ctx) => {
    const res = parser(ctx);
    return res.success ? success(res.ctx, fn(res.value)) : res;
  };
}
