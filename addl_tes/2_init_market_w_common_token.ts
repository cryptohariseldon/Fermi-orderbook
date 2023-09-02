import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { assert } from 'chai';
import { SimpleSerum } from '../target/types/fermi_dex';
import idl from "../../../target/idl/fermi_dex.json";
import solblog_keypair from "/Users/dm/Documents/blob_solana/wallet/fermi-orderbook/target/deploy/fermi_dex-keypair.json"
const fs = require('fs');

const {Keypair} = require("@solana/web3.js");
const secretKey = JSON.parse(fs.readFileSync("/Users/dm/.config/solana/id.json"));

const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
const authority = keypair;
const provider = anchor.AnchorProvider.env();

import {
    pcMint,
  } from "./constants_market2";
import {createMint, createAssociatedTokenAccount, mintTo} from "./utils"

const pcMintkey = new anchor.web3.PublicKey(pcMint);
describe('fermi-dex-init', () => {
let programId = "ASrtYDNReHLYmv9F72WVJ94v21cJNa2WKo3f2tGoAH7C"

const program = new anchor.Program(idl, programId, provider) //for existing prog
const coinMint = anchor.web3.Keypair.generate();
//const pcMint = anchor.web3.Keypair.generate();

let coinVault: anchor.web3.PublicKey;
let pcVault: anchor.web3.PublicKey;

let marketPda: anchor.web3.PublicKey;
let marketPdaBump: number;

let bidsPda: anchor.web3.PublicKey;
let bidsPdaBump: number;
let asksPda: anchor.web3.PublicKey;
let asksPdaBump: number;

let reqQPda: anchor.web3.PublicKey;
let reqQPdaBump: number;

let eventQPda: anchor.web3.PublicKey;
let eventQPdaBump: number;

let openOrdersPda: anchor.web3.PublicKey;
let openOrdersPdaBump: number;


let openOrders_secondPda: anchor.web3.PublicKey;
let openOrders_secondPdaBump: number;

//const authority = anchor.web3.Keypair.generate();
const authority = keypair;
const authority_second = anchor.web3.Keypair.generate(); //keypair_second;

console.log("TWO USER TESTING");
console.log(authority);
console.log(authority_second);

let authorityCoinTokenAccount: anchor.web3.PublicKey;
let authorityPcTokenAccount: anchor.web3.PublicKey;
let authority_secondCoinTokenAccount: anchor.web3.PublicKey;
let authority_secondPcTokenAccount: anchor.web3.PublicKey;
console.log('basics done')


before(async () => {
  /*
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL,
    ),
  );
*/
//const provider = anchor.AnchorProvider.env();

  await createMint(provider, coinMint, 9);
  //await createMint(provider, pcMint, 6);
  //program.programId = "HTbkjiBvVXMBWRFs4L56fSWaHpX343ZQGzY4htPQ5ver";
  [marketPda, marketPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('market', 'utf-8'),
      coinMint.publicKey.toBuffer(),
      pcMintkey.toBuffer(),
    ],
    program.programId,
  );

  [bidsPda, bidsPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('bids', 'utf-8'), marketPda.toBuffer()],
    program.programId,
  );
  [asksPda, asksPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('asks', 'utf-8'), marketPda.toBuffer()],
    program.programId,
  );

  [reqQPda, reqQPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('req-q', 'utf-8'), marketPda.toBuffer()],
    program.programId,
  );
  [eventQPda, eventQPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('event-q', 'utf-8'), marketPda.toBuffer()],
    program.programId,
  );

  [openOrdersPda, openOrdersPdaBump] =
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('open-orders', 'utf-8'),
        marketPda.toBuffer(),
        authority.publicKey.toBuffer(),
      ],
      program.programId,
    );

  coinVault = await spl.getAssociatedTokenAddress(
    coinMint.publicKey,
    marketPda,
    true,
  );
  pcVault = await spl.getAssociatedTokenAddress(
    pcMintkey,
    marketPda, 
    true,
  );
});

  describe('#initialize_new_market', async () => {
    it('should initialize market successfully', async () => {
    //  const market = await program.account.market.fetch(marketPda);

      await program.methods
        .initializeMarket(new anchor.BN('1000000000'), new anchor.BN('1000000'))
        .accounts({
          market: marketPda,
          coinVault,
          pcVault,
          coinMint: coinMint.publicKey,
          pcMint: pcMintkey,
          bids: bidsPda,
          asks: asksPda,
          reqQ: reqQPda,
          eventQ: eventQPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const market = await program.account.market.fetch(marketPda);
      assert(market.coinVault.equals(coinVault));
      assert(market.pcVault.equals(pcVault));
      assert(market.coinMint.equals(coinMint.publicKey));
      assert(market.pcMint.equals(pcMintkey));
      assert(market.coinDepositsTotal.eq(new anchor.BN(0)));
      assert(market.pcDepositsTotal.eq(new anchor.BN(0)));
      assert(market.bids.equals(bidsPda));
      assert(market.asks.equals(asksPda));
      assert(market.reqQ.equals(reqQPda));
      assert(market.eventQ.equals(eventQPda));
      assert(market.authority.equals(authority.publicKey));
    });
  });
});