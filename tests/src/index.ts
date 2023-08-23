import * as anchor from '@project-serum/anchor';
import { placeNewSellOrder } from './instructions/placeNewSellOrder';
import { placeNewBuyOrder } from './instructions/placeNewBuyOrder';
import { initializeMarket } from './instructions/initializeMarket';
import { Connection } from '@solana/web3.js';
import { getLocalKeypair } from './utils/getLocalKeypair';
import config from './config';
import { IDL } from '../../target/types/fermi_dex';
import { saveLogs } from './utils/saveLogs';
import { getEventQ } from './utils/getEventQ';
import { finalizeOrder } from './instructions/finalizeOrder';
import { airdropTo } from './instructions/airdrop';
import { getOpenOrders } from './utils/getOpenOrders';
import { coinMint, pcMint, pcVault, programId, reqQPda } from './constants';
import * as spl from '@solana/spl-token';
function sleep(ms) {
  console.log('Sleeping for ', ms / 1000, ' second');
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const createNewMarket = async () => {
  const market = await initializeMarket(config.localKpPath, config.programId);
  console.log('New market intialized!!');
};

const main = async () => {
  try {
    const { eventQPda, marketPda } = require('./constants');

    const localKp = getLocalKeypair('/Users/zero/.config/solana/id.json');
    const kp3 = getLocalKeypair('./kp3/key.json');
    const kp4 = getLocalKeypair('./kp4/key.json');
    // AIRDROP

    // await airdropTo(kp3);
    // await airdropTo(kp4);

    // await sleep(2000);

    //PLACE ORDERS
    //kp 4 places BUY ORDER for 26

    // const buyOrder = await placeNewBuyOrder(kp4, 26);
    // console.log(buyOrder.message);

    // const sellOrder = await placeNewSellOrder(kp3, 25);
    // console.log(sellOrder.message);


    // const buyOrder2 = await placeNewBuyOrder(kp3, 31);
    // console.log(buyOrder2.message);
    // await sleep(2000)
    // const sellOrder2 = await placeNewSellOrder(kp4, 30);
    // console.log(sellOrder2.message);
    // await sleep(2000)

    // TESTING FINALIZE FUNCTION
const event1 = 3;
const event2 = 5
    const wallet = new anchor.Wallet(kp4);
    const connection = new Connection(config.rpcUrl);
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions(),
    );
    const program = new anchor.Program(IDL, programId, provider);

    const authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      kp3.publicKey,
      false,
    );
    const openOrdersOwner = await getOpenOrders(kp3); // B1erGwD5eCMdS82rnTBmA9cEd3qykBhEuDYYN2VSHGc9
    const openOrdersCounterparty = await getOpenOrders(kp4); // 4NS41ufJ4WReeZnqePGA54EJ7e74vdfq7kELGs3LGxWf

    const finalizeTx = await program.methods
      .finaliseMatches(3, 5)
      .accounts({
        openOrdersOwner: openOrdersOwner.pda,
        openOrdersCounterparty: openOrdersCounterparty.pda,
        market: marketPda,
        pcVault: pcVault,
        coinMint: coinMint,
        pcMint: pcMint,
        reqQ: reqQPda,
        eventQ: eventQPda,
        authority: kp3.publicKey,
        pcpayer: authorityPcTokenAccount,
      })
      .signers([kp3])
      .rpc();

    console.log("Finalized successfull : ",finalizeTx)
    //CHECK EVENT QUEUE
    
    const eventQ = await getEventQ();

    saveLogs(eventQ, './tests/src/logs.txt');
  } catch (err) {
    console.log(err);
  }
};

//createNewMarket()
main();
