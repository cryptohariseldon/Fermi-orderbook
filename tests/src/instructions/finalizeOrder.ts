import * as anchor from '@project-serum/anchor';
import { getEventQ } from '../utils/getEventQ';
import { Keypair } from '@solana/web3.js';
import { getOpenOrders } from '../utils/getOpenOrders';
import { Connection } from '@solana/web3.js';
import config from '../config';
import * as spl from '@solana/spl-token';
import { FermiDex, IDL } from '../../../target/types/fermi_dex';

/*
MAKER
- sets limits orders .
- can be seen on orderbook .
- event which does not have orderIdSecond is Maker 
- older event is maker 
- passes as authority second to finalize
*/

/*
TAKER 
- instant trade / market orders / filled instantly
- event which has an matched orderIdSecond is Taker
- latest event is taker 
- passed as authority to finalize

*/

export async function finalizeOrder(
  eventSlot1: number,
  eventSlot2: number,
  authority: Keypair,
  authoritySecond: Keypair,
  program: anchor.Program<FermiDex>,
) {
  const {
    coinMint,
    eventQPda,
    marketPda,
    pcMint,
    pcVault,
    reqQPda,
  } = require('../constants');

}
