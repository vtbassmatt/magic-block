import Card from "scryfall-client/dist/models/card";
import { getCardNamed } from "scryfall-client";

interface CardMap {
  [index: string]: Card | false;
}

class CardDB {
  private cards: CardMap = {};

  async getCard(cardname: string): Promise<Card> {
    let self = this;
    let result = getCardNamed(cardname)
      .then(function (card) {
        self.cards[cardname] = card;
        return card;
      })
      .catch(function (err) {
        self.cards[cardname] = false;
        throw err;
      });
    return result;
  }
}

export const cardLookup = new CardDB();
