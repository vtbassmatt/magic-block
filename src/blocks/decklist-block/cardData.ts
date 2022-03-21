import Card from "scryfall-client/dist/models/card";
import { getCardNamed } from "scryfall-client";

export class CardNotFound {}
type MaybeCard = Card | CardNotFound;

interface CardMap {
  [index: string]: MaybeCard;
}

class CardDB {
  private cards: CardMap = {};

  async getCard(cardname: string, setcode?: string): Promise<MaybeCard> {
    const cardKey = cardname + setcode;
    if (cardKey in this.cards) {
      const cachedCardData = this.cards[cardKey];
      return Promise.resolve(cachedCardData);
    }

    let self = this;
    const options = setcode ? { set: setcode } : {};
    return getCardNamed(cardname, options)
      .then(function (card) {
        self.cards[cardKey] = card;
        return card;
      })
      .catch(function (err) {
        if (err?.originalError?.status == 404) {
          // cache 404s
          self.cards[cardKey] = new CardNotFound();
          return Promise.resolve(self.cards[cardKey]);
        } else {
          // don't cache non-404s, it could be transient
          return Promise.resolve(new CardNotFound());
        }
      });
  }
}

export const cardLookup = new CardDB();
