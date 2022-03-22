import { FileBlockProps } from "@githubnext/utils";
import { useState } from "react";
import { useQuery } from "react-query";
import { getCardNamed } from "scryfall-client/dist/api-routes/cards";
import { parseLine } from "./cardParser";
import "./index.css";

const displayTypes = {
  text: "text",
  images: "images",
};

export default function (props: FileBlockProps) {
  const { context, content, metadata, onUpdateMetadata } = props;
  const listEntries = content.split("\n");
  const [displayType, setDisplayType] = useState(displayTypes.text);

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
        <ul className="color-bg-default">
          {Object.values(listEntries).map((line, index) => {
            return <ListItem key={index} value={line} />;
          })}
        </ul>
      </div>
    </div>
  );
}

const ListItem = ({ value }: { value: string }) => {
  let card = parseLine(value);
  switch (card.kind) {
    case "card":
      return (
        <CardItem
          cardname={card.cardname}
          count={card.count}
          setcode={card.setcode}
          collectorNumber={card.collectorNumber}
        />
      );
    case "comment":
      return <CommentItem value={card.value} />;
    case "uncertain":
      return <UncertainItem value={card.line} />;
    case "blank":
      return <CommentItem value=" " />;
    default:
      const _exhaustion: never = card;
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

// TODO: account for collectorNumber too
const CardItem = ({
  cardname,
  count,
  setcode,
  collectorNumber,
}: {
  cardname: string;
  count: number;
  setcode?: string;
  collectorNumber?: number;
}) => {
  let baseScryfallLink = setcode
    ? `https://scryfall.com/search?q=!%22${cardname}%22%20set%3A${setcode}`
    : `https://scryfall.com/search?q=!%22${cardname}%22%20`;
  const { data, status } = useQuery(
    ["card", cardname],
    () => getCardNamed(cardname, { set: setcode }),
    {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) =>
        failureCount <= 2 && error?.originalError?.response?.statusCode != 404,
    }
  );

  return (
    <li className="mb-1">
      <span className="cardcount">{count > 1 ? count + "x " : ""}</span>
      {/* @ts-ignore */}
      {status !== "success" && (
        <a
          href={baseScryfallLink}
          target="_blank"
          className={linkClassMap[status]}
        >
          {cardname}
        </a>
      )}
      {status === "success" && (
        <a
          href={data.scryfall_uri}
          target="_blank"
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
