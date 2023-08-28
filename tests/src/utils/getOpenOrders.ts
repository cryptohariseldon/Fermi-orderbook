import * as anchor from "@project-serum/anchor"
import config from "../config";
import { marketPda } from "../constants";
import {Keypair} from '@solana/web3.js'
import { FermiDex, IDL } from "../../../target/types/fermi_dex";
import {Connection} from "@solana/web3.js"

export const getOpenOrders = async (userKp:Keypair) => {
  const authority = userKp  
  const connection = new Connection(config.rpcUrl);
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions(),
  );
  const program = new anchor.Program(IDL, config.programId, provider);
  const [openOrdersPda] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('open-orders', 'utf-8'),
      new anchor.web3.PublicKey(marketPda).toBuffer(),
      authority.publicKey.toBuffer(),
    ],
    new anchor.web3.PublicKey(config.programId),
  );

  const openOrders = await program.account.openOrders.fetch(openOrdersPda)
  const orders = openOrders.orders.map(item=>item.toString());

  return {orders:orders,pda:openOrdersPda}
}
