import getFermiDexProgram from '../utils/getFermiDexProgram';
import { Keypair } from '@solana/web3.js';
import { getOpenOrders } from '../utils/getOpenOrders';
import {
  coinMint,
  eventQPda,
  marketPda,
  pcMint,
  reqQPda,
  coinVault,
  pcVault,
} from '../constants';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import * as anchor from '@project-serum/anchor';

type FinaliseMatchesBidParams = {
  eventSlot1: number;
  eventSlot2: number;
  authority: Keypair;
  authoritySecond: Keypair;
  openOrdersOwnerPda:anchor.web3.PublicKey
  openOrdersCounterpartyPda:anchor.web3.PublicKey
};

export const finaliseMatchesBid = async ({
  eventSlot1,
  eventSlot2,
  authority,
  authoritySecond,
  openOrdersOwnerPda,
  openOrdersCounterpartyPda
}: FinaliseMatchesBidParams): Promise<string> => {

    const program = getFermiDexProgram(authoritySecond);

    const authorityPcTokenAccount = await getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authoritySecond.publicKey,
      false,
    );


    const finalizeBidTx = await program.methods
      .finaliseMatchesBid(eventSlot1, eventSlot2)
      .accounts({
        openOrdersOwner: openOrdersOwnerPda,
        openOrdersCounterparty: openOrdersCounterpartyPda,
        market: marketPda,
        pcVault: pcVault,
        reqQ: reqQPda,
        eventQ: eventQPda,
        authority: authority.publicKey,
        coinMint: coinMint,
        pcMint: pcMint,
        pcpayer: authorityPcTokenAccount,
      })
      .signers([authority])
      .rpc();

    console.log('✅ finalized bid : ', finalizeBidTx);
    return finalizeBidTx;

};
