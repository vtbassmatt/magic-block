import Card from "scryfall-client/dist/models/card";
import { getCardNamed } from "scryfall-client";

export class CardNotFound {}
type MaybeCard = Card | CardNotFound;

interface CardMap {
  [index: string]: MaybeCard;
}

class CardDB {
  private cards: CardMap = {};

  async getCard(cardname: string): Promise<MaybeCard> {
    if (cardname in this.cards) {
      const cachedCardData = this.cards[cardname];
      return Promise.resolve(cachedCardData);
    }

    let self = this;
    return getCardNamed(cardname)
      .then(function (card) {
        self.cards[cardname] = card;
        return card;
      })
      .catch(function (err) {
        if (err?.originalError?.status == 404) {
          // cache 404s
          self.cards[cardname] = new CardNotFound();
          return Promise.resolve(self.cards[cardname]);
        } else {
          // don't cache non-404s, it could be transient
          return Promise.resolve(new CardNotFound());
        }
      });
  }
}

export const cardLookup = new CardDB();
