import { FileBlockProps } from "@githubnext/utils";
import { cardLookup } from "./cardData";
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
  const isComment = value.startsWith("#") || value.startsWith("//");
  if (isComment) {
    return <Comment value={value} />;
  }
  const hasCount = /(\d+) (.*)/i;
  const data = value.match(hasCount);
  if (data) {
    const count = data[1];
    const name = data[2];
    return <Card cardname={name} count={parseInt(count)} />;
  }
  return <Uncertain value={value} />;
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
  const scryfallLink = `https://scryfall.com/search?q=!%22${cardname}%22`;
  return (
    <li className="card mb-1">
      <span className="cardcount">{count > 1 ? count + "x " : ""}</span>
      <a href={scryfallLink} target="_blank">
        {cardname}
      </a>{" "}
      <button className="btn btn-sm" onClick={() => scryfallTest(cardname)}>
        Scryfall test
      </button>
    </li>
  );
};

function scryfallTest(cardname: string) {
  cardLookup
    .getCard(cardname)
    .then(function (card) {
      alert(card.type_line);
    })
    .catch(function (err) {
      console.log(err);
    });
}
