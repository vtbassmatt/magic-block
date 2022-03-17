import Card from "scryfall-client/dist/models/card";
import { getCardNamed } from "scryfall-client";

interface CardMap {
  [index: string]: Card | false;
}

class CardDB {
  private cards: CardMap = {};

  async getCard(cardname: string): Promise<Card> {
    if (cardname in this.cards) {
      const maybeCardData = this.cards[cardname];
      if (maybeCardData) return Promise.resolve(maybeCardData);
      return Promise.reject("card was not found");
    }

    let self = this;
    return getCardNamed(cardname)
      .then(function (card) {
        self.cards[cardname] = card;
        return card;
      })
      .catch(function (err) {
        self.cards[cardname] = false;
        if (err?.originalError?.status == 404) {
          return Promise.reject("card not found on Scryfall");
        }
        throw err;
      });
  }
}

export const cardLookup = new CardDB();
