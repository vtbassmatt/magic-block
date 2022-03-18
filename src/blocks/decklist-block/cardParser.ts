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

type ParsedLine = CommentLine | CardLine | UncertainLine;

export function parseLine(value: string): ParsedLine {
  const isComment =
    value.trimStart().startsWith("#") || value.trimStart().startsWith("//");
  if (isComment) return commentLine(value);

  const hasCount = /(?<count>\d+) (?<name>.*)/i;
  const data = value.match(hasCount);
  if (data && data.groups) {
    const count = data.groups.count || "1";
    const name = data.groups.name || undefined;
    if (name === undefined) {
      // bail if we couldn't find a card name
      return uncertainLine(value);
    }
    return cardLine(name, parseInt(count));
  }

  return uncertainLine(value);
}

/////// Grammar ///////

/* EBNF for a card line:
 *
 * line = comment | cardspec
 * cardspec = count SP cardname
 *          | count SP '[' setcode '#' collectornum ']' SP cardname
 *          | count 'x' SP cardname SP '(' setcode ')' foil? tags? earcolor?
 * SP = \s
 * count = [1-9][0-9]*
 * setcode = [A-Z][A-Z0-9]{2,3} | [a-z][a-z0-9]{2,3}
 * collectornum = count
 * foil = '*F*'
 * tags = '[' [^]]* ']'
 * earcolor = '^' [^^]* '^'
 * comment = ('#' | '//') .*
 */

function parse(text: string): ParsedLine {
  const res = line({ text, index: 0 });
  if (res.success) return res.value;
  console.log(
    `Parse error, expected ${res.expected} at char ${res.ctx.index} ("${text}")`
  );
  return uncertainLine(text);
}

// line = comment | cardspec
function line(ctx: Context): Result<CommentLine | CardLine> {
  return any<CommentLine | CardLine>([comment, cardspec])(ctx);
}

// comment = ('#' | '//') .*
function comment(ctx: Context): Result<CommentLine> {
  const comment = sequence<string>([
    any<string>([str("#"), str("//")]),
    regex(/.*/, "comment"),
  ])(ctx);
  if (comment.success) {
    return success(comment.ctx, commentLine(comment.value[1]));
  }
  return comment;
}

const comment2 = map(
  sequence<string>([
    any<string>([str("#"), str("//")]),
    regex(/.*/, "comment"),
  ]),
  ([_lead, rest]): CommentLine => commentLine(rest)
);

function cardspec(ctx: Context): Result<CardLine> {
  throw "";
}

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
    let values: T[] = [];
    let nextCtx = ctx;
    for (const parser of parsers) {
      const res = parser(nextCtx);
      if (!res.success) return res;
      values.push(res.value);
      nextCtx = res.ctx;
    }
    return success(nextCtx, values);
  };
}

function any<T>(parsers: Parser<T>[]): Parser<T> {
  return (ctx) => {
    let furthestRes: Result<T> | null = null;
    for (const parser of parsers) {
      const res = parser(ctx);
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
