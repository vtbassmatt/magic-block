import { FileBlockProps } from "@githubnext/utils";
import { useState } from "react";
import { cardLookup, CardNotFound } from "./cardData";
import { parseLine } from "./cardParser";
import "./index.css";

export default function (props: FileBlockProps) {
  const { context, content, metadata, onUpdateMetadata } = props;
  const listEntries = content.split("\n");

  return (
    <div className="Box m-4">
      <div className="Box-header">
        <h3 className="Box-title">Decklist: {context.path}</h3>
      </div>
      <div className="Box-body">
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
      return <Card cardname={card.cardname} count={card.count} />;
    case "comment":
      return <Comment value={card.value} />;
    case "uncertain":
      return <Uncertain value={card.line} />;
    default:
      const _exhaustion: never = card;
      return _exhaustion;
  }
};

const Uncertain = ({ value }: { value: string }) => {
  return <li className="uncertain mb-1">{value || "\u00a0"}</li>;
};

const Comment = ({ value }: { value: string }) => {
  return (
    <li className="comment mb-1">
      <pre>{value}</pre>
    </li>
  );
};

const Card = ({ cardname, count }: { cardname: string; count: number }) => {
  const [typeline, setTypeline] = useState("(loading...)");
  const [scryfallLink, setScryfallLink] = useState(
    `https://scryfall.com/search?q=!%22${cardname}%22`
  );
  const [successClassName, setSuccessClassName] = useState("card-pending");

  cardLookup
    .getCard(cardname)
    .then(function (card) {
      if (card instanceof CardNotFound) {
        setTypeline("[card not found]");
        setSuccessClassName("card-failure");
      } else {
        setTypeline("[" + card.card_faces[0].type_line + "]");
        setScryfallLink(card.scryfall_uri);
        setSuccessClassName("card-success");
      }
    })
    .catch(function (err) {
      console.log(err);
    });

  return (
    <li className="mb-1">
      <span className="cardcount">{count > 1 ? count + "x " : ""}</span>
      <a href={scryfallLink} target="_blank" className={successClassName}>
        {cardname}
      </a>{" "}
      <span>{typeline}</span>
    </li>
  );
};
