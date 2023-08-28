import getFermiDexProgram from "../utils/getFermiDexProgram";
import {Keypair} from "@solana/web3.js"
import { getOpenOrders } from "../utils/getOpenOrders";
import { coinMint, eventQPda, marketPda, pcMint, reqQPda,coinVault } from "../constants";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import * as anchor from "@project-serum/anchor"

type FinaliseMatchesAskParams = {
  eventSlot1:number,
  eventSlot2:number
  authority:Keypair
  authoritySecond:Keypair
  openOrdersOwnerPda:anchor.web3.PublicKey
  openOrdersCounterpartyPda:anchor.web3.PublicKey
}


export const finaliseMatchesAsk = async ({eventSlot1,eventSlot2,authority,authoritySecond,openOrdersOwnerPda,openOrdersCounterpartyPda}:FinaliseMatchesAskParams): Promise<string> => {
  
  const program = getFermiDexProgram(authoritySecond);
  
  const authorityCoinTokenAccount = await getAssociatedTokenAddress(
    new anchor.web3.PublicKey(coinMint),
    authority.publicKey,
    false,
  );
  
  const finalizeAskTx = await program.methods
    .finaliseMatchesAsk(eventSlot1, eventSlot2)
    .accounts({
      openOrdersOwner: openOrdersOwnerPda,
      openOrdersCounterparty: openOrdersCounterpartyPda,
      market: marketPda,
      coinMint: coinMint,
      pcMint: pcMint,
      reqQ: reqQPda,
      eventQ: eventQPda,
      authority: authority.publicKey,
      coinpayer: authorityCoinTokenAccount,
      authoritySecond: authoritySecond.publicKey,
      coinVault:coinVault,
    })
    .signers([authority])
    .rpc();

  console.log('✅ finalized Ask : ', finalizeAskTx);
  return finalizeAskTx;
};
