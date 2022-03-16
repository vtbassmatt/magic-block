import { FileBlockProps } from "@githubnext/utils";
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
        Metadata example: this button has been clicked{" "}
        <button
          className="btn"
          onClick={() =>
            onUpdateMetadata({ number: (metadata.number || 0) + 1 })
          }
        >
          {metadata.number || 0} times
        </button>
        <ul>
          {Object.values(listEntries).map((line, index) => {
            return <Noncard key={index} value={line} />;
          })}
        </ul>
      </div>
    </div>
  );
}

const Noncard = ({ value }: { value: string }) => {
  return (
    <li className="zebra">
      <pre>{value || " "}</pre>
    </li>
  );
};
