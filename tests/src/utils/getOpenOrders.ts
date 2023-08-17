import * as anchor from "@project-serum/anchor"

import config from "../config";
import { marketPda } from "../constants";
import {Keypair} from '@solana/web3.js'
import { FermiDex } from "../../../target/types/fermi_dex";

export const getOpenOrders = async (userKp:Keypair,program:anchor.Program<FermiDex>) => {
  const authority = userKp  
  const [openOrdersPda] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('open-orders', 'utf-8'),
      new anchor.web3.PublicKey(marketPda).toBuffer(),
      authority.publicKey.toBuffer(),
    ],
    new anchor.web3.PublicKey(config.programId),
  );

  const openOrders = await program.account.openOrders.fetch(openOrdersPda)

  return {orders:openOrders.orders,pda:openOrdersPda}
}
