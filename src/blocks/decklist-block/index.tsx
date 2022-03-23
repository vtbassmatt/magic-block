import { FileBlockProps } from "@githubnext/utils";
import { useState } from "react";
import { useQuery } from "react-query";
import { getCardNamed } from "scryfall-client/dist/api-routes/cards";
import { parseLine, ParsedLine, CardLine } from "./cardParser";
import "./index.css";

const displayTypes = {
  text: "text",
  images: "images",
};

interface DisplayEntry {
  parsedLine: ParsedLine;
  card?: any;
}

function makeDisplayEntry(parsedLine: ParsedLine): DisplayEntry {
  return {
    parsedLine: parsedLine,
    // TODO: account for collectorNumber too
    card:
      parsedLine.kind == "card"
        ? useQuery(
            ["card", parsedLine.cardname],
            () =>
              getCardNamed(parsedLine.cardname, { set: parsedLine.setcode }),
            {
              refetchOnWindowFocus: false,
              retry: (failureCount, error: any) =>
                failureCount <= 2 &&
                error?.originalError?.response?.statusCode != 404,
            }
          )
        : undefined,
  };
}

export default function (props: FileBlockProps) {
  const { context, content, metadata, onUpdateMetadata } = props;
  const [displayType, setDisplayType] = useState(displayTypes.text);

  const listEntries = content.split("\n");
  const cardLines = Object.values(listEntries).map((line) => parseLine(line));
  const cardDisplays = Object.values(cardLines).map((parsedLine) =>
    makeDisplayEntry(parsedLine)
  );

  return (
    <div className="Box m-4">
      <div className="Box-header">
        <h3 className="Box-title">Decklist: {context.path}</h3>
      </div>
      <div className="Box-body">
        <form>
          <p>View as</p>
          <select
            className="form-select"
            value={displayType}
            onChange={(e) => setDisplayType(e.target.value)}
          >
            <option value="text">Text</option>
            <option value="images">Images</option>
          </select>
        </form>
        {displayType === displayTypes.text && (
          <ul className="color-bg-default">
            {Object.values(cardDisplays).map((value, index) => {
              return <ListItem key={index} value={value} />;
            })}
          </ul>
        )}
        {displayType === displayTypes.images && (
          <div className="container-lg clearfix">
            {Object.values(cardDisplays).map((value, index) => {
              return <CardImage key={index} value={value} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const CardImage = ({ value }: { value: DisplayEntry }) => {
  switch (value.parsedLine.kind) {
    case "card":
      const { data, status } = value.card;
      return (
        <div className="col-4 float-left border p-4">
          <img src={data.image_uris.small} />
          <p>
            {data.card_faces[0].name}
            <br />
            {data.card_faces[0].type_line}
          </p>
        </div>
      );
    case "comment":
    case "uncertain":
    case "blank":
      return <div></div>;
    default:
      const _exhaustion: never = value.parsedLine;
      return _exhaustion;
  }
};

const ListItem = ({ value }: { value: DisplayEntry }) => {
  switch (value.parsedLine.kind) {
    case "card":
      return <CardItem cardline={value.parsedLine} card={value.card} />;
    case "comment":
      return <CommentItem value={value.parsedLine.value} />;
    case "uncertain":
      return <UncertainItem value={value.parsedLine.line} />;
    case "blank":
      return <CommentItem value=" " />;
    default:
      const _exhaustion: never = value.parsedLine;
      return _exhaustion;
  }
};

const UncertainItem = ({ value }: { value: string }) => {
  return <li className="uncertain mb-1">{value || "\u00a0"}</li>;
};

const CommentItem = ({ value }: { value: string }) => {
  return (
    <li className="comment mb-1">
      <pre>{value}</pre>
    </li>
  );
};

const linkClassMap = {
  success: "card-success",
  error: "card-failure",
  loading: "card-pending",
  idle: "card-pending",
};

const CardItem = ({ cardline, card }: { cardline: CardLine; card: any }) => {
  const { cardname, setcode, count, collectorNumber } = cardline;
  let baseScryfallLink = setcode
    ? `https://scryfall.com/search?q=!%22${cardname}%22%20set%3A${setcode}`
    : `https://scryfall.com/search?q=!%22${cardname}%22%20`;
  const { data, status } = card;

  return (
    <li className="mb-1">
      <span className="cardcount">{count > 1 ? count + "x " : ""}</span>
      {/* @ts-ignore */}
      {status !== "success" && (
        <a
          href={baseScryfallLink}
          target="_blank"
          /* @ts-ignore */
          className={linkClassMap[status]}
        >
          {cardname}
        </a>
      )}
      {status === "success" && (
        <a
          href={data.scryfall_uri}
          target="_blank"
          /* @ts-ignore */
          className={linkClassMap[status]}
        >
          {cardname}
        </a>
      )}{" "}
      {status === "loading" && <span>(loading...)</span>}
      {status === "success" && <span>{data.card_faces[0].type_line}</span>}
      {status === "error" && <span>[card not found]</span>}
      {setcode === undefined ? "" : <span> {setcode}</span>}
      {collectorNumber === undefined ? "" : <span>#{collectorNumber}</span>}
    </li>
  );
};
