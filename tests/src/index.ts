import * as anchor from '@project-serum/anchor';
import { openOrdersPda } from '../../extra_tests/utils/constants';
import { airdropTo } from './instructions/airdrop';
import { placeNewSellOrder } from './instructions/placeNewSellOrder';
import { placeNewBuyOrder } from './instructions/placeNewBuyOrder';
import { initializeMarket } from './instructions/initializeMarket';
import { Connection } from '@solana/web3.js';
import { getLocalKeypair } from './utils/getLocalKeypair';
import fs from 'fs';
import config from './config';
import { IDL } from '../../target/types/fermi_dex';
import { saveLogs } from './utils/saveLogs';
import { getEventQ } from './utils/getEventQ';
import { finalizeOrder } from './instructions/finalizeOrder';
import { getOpenOrders } from './utils/getOpenOrders';


const createNewMarket = async () => {
    const market = await initializeMarket(config.localKpPath, config.programId);
    console.log('New market intialized!!');
};

const main = async () => {
  try {
    const { eventQPda, marketPda } = require('./constants');
    
    const localKp = getLocalKeypair('/Users/zero/.config/solana/id.json')
    const kp3 = getLocalKeypair('./kp3/key.json'); // HubyrMHSh2s5KXeTYRFhYbY32hVPrG8bbAre2AzewqRR
    const kp4 = getLocalKeypair('./kp4/key.json'); // EN31BH6XonqZdwZrMpqtgHcQ8supSZqVhBEE5GhmVrN6

    const authority = localKp;
    const connection = new Connection(config.rpcUrl);
    const wallet = new anchor.Wallet(authority);
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions(),
    );
    
    const program = new anchor.Program(IDL, config.programId, provider);



    // AIRDROP
    // console.log("------------------------")
    // console.log("LET'S START THE AIRDROP")
    // console.log("------------------------")
    
    // await airdropTo(kp3);
    // await airdropTo(kp4);   

    // PLACE ORDERS

    // const buyOrder = await placeNewBuyOrder(kp3, 26);
    // console.log(buyOrder.message);
    // const sellOrder = await placeNewSellOrder(kp4, 25);
    // console.log(sellOrder.message);


    // CHECK EVENT QUEUE
    // const eventQ = await getEventQ()


    // FINALIZE ORDER
    // console.log("finalize order for kp3")
    // await finalizeOrder(kp3);


    //saveLogs(eventQ, './tests/src/logs.txt');
  } catch (err) {
    console.log(err);
  }
};

// createNewMarket()
main();
