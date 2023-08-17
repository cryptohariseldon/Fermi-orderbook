import * as anchor from '@project-serum/anchor';
import { getEventQ } from '../utils/getEventQ';
import { Keypair } from '@solana/web3.js';
import { getOpenOrders } from '../utils/getOpenOrders';
import { Connection } from '@solana/web3.js';
import config from '../config';
import * as spl from '@solana/spl-token';
import { IDL } from '../../../target/types/fermi_dex';
import {
  coinMint,
  eventQPda,
  marketPda,
  pcMint,
  pcVault,
  reqQPda,
} from '../constants';

function findMatchingEvents(orderId: string, events: any[]) {
  if (orderId === '0') return;
  let matchingOrderId;
  let matchingOrderIdSecond;

  for (const event of events) {
    // if native qty is 0 then skip the event
    if (event.nativeQtyReleased === '0') continue;
    if (event.orderId === orderId) {
      matchingOrderId = event.idx;
    }
    if (event.orderIdSecond === orderId) {
      matchingOrderIdSecond = event.idx;
    }
  }

  if (matchingOrderId && matchingOrderIdSecond) {
    return { matchingOrderId, matchingOrderIdSecond };
  }
}

export async function finalizeOrder(
  authority: Keypair,
  authoritySecond: Keypair,
) {
  const events = await getEventQ();
  const wallet = new anchor.Wallet(authority);
  const connection = new Connection(config.rpcUrl);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions(),
  );
  const program = new anchor.Program(IDL, config.programId, provider);
  const openOrders = await getOpenOrders(authority, program);
  const openOrdersSecond = await getOpenOrders(authoritySecond, program);

  const orderIds = openOrders.orders.map((item) => item.toString());

  for (let orderId of orderIds) {
    const { matchingOrderId, matchingOrderIdSecond } = findMatchingEvents(
      orderId,
      events,
    );
    console.log({ matchingOrderId, matchingOrderIdSecond });

    const authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authority.publicKey,
      false,
    );

    const authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(coinMint),
      authoritySecond.publicKey,
      false,
    );

    await program.methods
      .finaliseMatches(matchingOrderId, matchingOrderIdSecond)
      .accounts({
        openOrdersOwner: openOrders.pda,
        openOrdersCounterparty: openOrdersSecond.pda,
        market: marketPda,
        pcVault: pcVault,
        coinMint: coinMint,
        pcMint: pcMint,
        reqQ: reqQPda,
        eventQ: eventQPda,
        authority: authority.publicKey,
        pcpayer: authorityPcTokenAccount,
        coinpayer: authorityCoinTokenAccount,
      })
      .signers([authority])
      .rpc();

    console.log(`Finalized order ${orderId}!!`);
  }
}
