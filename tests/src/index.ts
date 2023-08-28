import * as anchor from '@project-serum/anchor';
import { placeNewSellOrder } from './instructions/placeNewSellOrder';
import { placeNewBuyOrder } from './instructions/placeNewBuyOrder';
import { initialiseMarket } from './instructions/initialiseMarket';
import { Connection } from '@solana/web3.js';
import { getLocalKeypair } from './utils/getLocalKeypair';
import config from './config';
import { IDL } from '../../target/types/fermi_dex';
import { saveLogs } from './utils/saveLogs';
import { getEventQ } from './utils/getEventQ';
import { airdropTo } from './instructions/airdrop';
import { getOpenOrders } from './utils/getOpenOrders';

import * as spl from '@solana/spl-token';
import getFermiDexProgram from './utils/getFermiDexProgram';
import { finaliseMatchesAsk } from './instructions/finaliseMatchesAsk';
import { finaliseMatchesBid } from './instructions/finaliseMatchesBid';
import { findMatchingEvents } from './utils/findMatchingEvents';

function sleep(ms) {
  console.log('Sleeping for ', ms / 1000, ' second');
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const createNewMarket = async () => {
  const market = await initialiseMarket(config.localKpPath, config.programId);
  console.log('New market intialized!!');

  const kp3 = getLocalKeypair('./kp3/key.json');
  const kp4 = getLocalKeypair('./kp4/key.json');
  // SHOULD AIRDROP TOKENS 
  await airdropTo(kp3);
  await airdropTo(kp4);
};

const main = async () => {
  try {
    const {
      eventQPda,
      marketPda,
      coinMint,
      pcMint,
      pcVault,
      programId,
      reqQPda,
      coinVault
    } = require('./constants');

    const localKp = getLocalKeypair('/Users/zero/.config/solana/id.json');
    const kp3 = getLocalKeypair('./kp3/key.json');
    const kp4 = getLocalKeypair('./kp4/key.json');


    // // SHOULD AIRDROP TOKENS 
    // await airdropTo(kp3);
    // await airdropTo(kp4);

    // await sleep(2000);
    // PLACE ORDERS

    // // SHOULD PLACE BUY ORDER 
    // const buyOrder = await placeNewBuyOrder(kp3, 56);
    // console.log(buyOrder.message);

    // // SHOULD PLACE SELL ORDER
    // const sellOrder = await placeNewSellOrder(kp4, 55);
    // console.log(sellOrder.message);

    
    // // SHOULD FINALISE ASK 
    // const finaliseMatchesAskTx = await finaliseMatchesAsk({event1:3,event2:5,authority:kp3,authoritySecond:kp4});
    // console.log("Ask finalised : ",finaliseMatchesAsk)

    // // SHOULD FINALIZE BID
    // const finaliseMatchesBidTx = await finaliseMatchesBid({event1:3,event2:5,authority:kp3,authoritySecond:kp4});
    // console.log("Bid finalised : ",finaliseMatchesBid)

    // SHOULD FETCH AND SAVE EVENT QUEUE
    const eventQ = await getEventQ();
    const openOrdersKp3 = await getOpenOrders(kp3); 
    const openOrdersKp4 = await getOpenOrders(kp4);

    const matchedEventsKp3 = findMatchingEvents(openOrdersKp3.orders,eventQ);
    const matchedEventsKp4 = findMatchingEvents(openOrdersKp4.orders,eventQ);



    // Convert map to object `const obj = Object.fromEntries(myMap)`
    saveLogs({eventQ,matchedEventsKp3:Object.fromEntries(matchedEventsKp3),matchedEventsKp4:Object.fromEntries(matchedEventsKp4)}, './tests/src/logs.txt'); 

  } catch (err) {
    console.log(err);
  }
};

//createNewMarket();
main();
