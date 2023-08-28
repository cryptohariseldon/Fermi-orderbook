import config from "../config";
import { airdropTo } from "../instructions/airdrop";
import { finaliseMatchesAsk } from "../instructions/finaliseMatchesAsk";
import { finaliseMatchesBid } from "../instructions/finaliseMatchesBid";
import { initialiseMarket } from "../instructions/initialiseMarket";
import { placeNewBuyOrder } from "../instructions/placeNewBuyOrder";
import { placeNewSellOrder } from "../instructions/placeNewSellOrder";
import { getEventQ } from "../utils/getEventQ";
import { getLocalKeypair } from "../utils/getLocalKeypair";
import { saveLogs } from "../utils/saveLogs";

const chai = require('chai');
const assert = chai.assert;

const {
  eventQPda,
  marketPda,
  coinMint,
  pcMint,
  pcVault,
  programId,
  reqQPda,
  coinVault
} = require('../constants');

const localKp = getLocalKeypair('/Users/zero/.config/solana/id.json');
const kp3 = getLocalKeypair('./kp3/key.json');
const kp4 = getLocalKeypair('./kp4/key.json');

function sleep(ms) {
  console.log('Sleeping for ', ms / 1000, ' second');
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Fermi DEX tests', function() {
  // before(async ()=>{
  //   const market = await initialiseMarket(config.localKpPath, config.programId);

  // })
  it('SHOULD AIRDROP TOKENS 🪂', async function() {
    await airdropTo(kp3);
    await airdropTo(kp4);
    await sleep(5000);
    await airdropTo(kp3);
    await airdropTo(kp4);
    await sleep(5000)
  });

  it('SHOULD PLACE BUY ORDER 🚀', async function() {
    const buyOrder = await placeNewBuyOrder(kp4, 26);
    console.log(buyOrder.message);
    // Add assertions
    assert.isNotNull(buyOrder, 'Buy order should not be null');
  });

  it('SHOULD PLACE SELL ORDER 🚀', async function() {
    const sellOrder = await placeNewSellOrder(kp3, 25);
    console.log(sellOrder.message);
    // Add assertions
    assert.isNotNull(sellOrder, 'Sell order should not be null');
  });

  it('SHOULD FINALISE ASK ✨', async function() {
    const finaliseMatchesAskTx = await finaliseMatchesAsk({eventSlot1: 2, eventSlot2: 4, authority: kp3, authoritySecond: kp4});
    console.log("Ask finalised : ", finaliseMatchesAskTx);
    // Add assertions
    assert.isNotNull(finaliseMatchesAskTx, 'Finalise ask transaction should not be null');
  });

  it('SHOULD FINALIZE BID ✨', async function() {
    const finaliseMatchesBidTx = await finaliseMatchesBid({event1: 2, event2: 4, authority: kp3, authoritySecond: kp4});
    console.log("Bid finalised : ", finaliseMatchesBidTx);
    // Add assertions
    assert.isNotNull(finaliseMatchesBidTx, 'Finalise bid transaction should not be null');
  });

  it('SHOULD FETCH AND SAVE EVENT QUEUE 📄', async function() {
    const eventQ = await getEventQ();
    saveLogs(eventQ, './tests/src/logs.txt');
  });
});

