import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';

import { Connection, PublicKey } from '@solana/web3.js';
import {
    asksPda,
    bidsPda,
    coinMint,
    coinVault,
    eventQPda,
    marketPda,
    pcMint,
    pcVault,
    reqQPda,
    programId,
} from "../constants";
import fs from 'fs';
import { IDL } from '../../../target/types/fermi_dex';
import {Keypair} from "@solana/web3.js"
import config from '../config';

/**
 * Place a new limit sell order
 * 
 * @param kp - User's kp
 * @param price - The price for the sell order.
 * @returns A confirmation message.
 */
export async function placeNewSellOrder(
    kp: Keypair,
    price: number = 22
) {
    try{
    const authority = kp;
    let openOrdersPda: anchor.web3.PublicKey;
    let openOrdersPdaBump: number;

    const wallet = new anchor.Wallet(authority);
    const conn = new Connection(config.rpcUrl);
    const provider = new anchor.AnchorProvider(conn, wallet, anchor.AnchorProvider.defaultOptions());

    const program = new anchor.Program(IDL, programId, provider);
    const authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
        new anchor.web3.PublicKey(pcMint),
        authority.publicKey,
        false,
    );
    const authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
        new anchor.web3.PublicKey(coinMint),
        authority.publicKey,
        false,
    );

    [openOrdersPda, openOrdersPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
        [
            Buffer.from('open-orders', 'utf-8'),
            new anchor.web3.PublicKey(marketPda).toBuffer(),
            authority.publicKey.toBuffer(),
        ],
        new anchor.web3.PublicKey(programId),
    );

    await program.methods
        .newOrder(
            { ask: {} },
            new anchor.BN(price),
            new anchor.BN(1),
            new anchor.BN(price),
            { limit: {} },
        )
        .accounts({
            openOrders: openOrdersPda,
            market: marketPda,
            coinVault,
            pcVault,
            coinMint: coinMint,
            pcMint: pcMint,
            payer: authorityCoinTokenAccount,
            bids: bidsPda,
            asks: asksPda,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();


    return {
        message: 'Place limit order sell price: ' + price,
    };
  }catch(err){
    console.log("something went wrong while placing a sell order!")
    console.log(err)
  }
}
