import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import idl from "../../target/idl/fermi_dex.json";
const fs = require('fs');
import {Token} from "@solana/spl-token"
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
  } from "../src/constants";
import { IDL } from '../../target/types/fermi_dex';

const {Keypair} = require("@solana/web3.js");
// const secretKey = JSON.parse(fs.readFileSync("/Users/dm/.config/solana/id.json"));
// const secretKeynew = JSON.parse(fs.readFileSync("/Users/dm/Documents/fermi_labs/basic/keypair2/keypair2.json"));
//const secretKeyThird= JSON.parse(fs.readFileSync("./kp3/key.json"));

const secretKeyKp4= JSON.parse(fs.readFileSync("./kp4/key.json"));
const kp4 = Keypair.fromSecretKey(new Uint8Array(secretKeyKp4));
//const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));


const authority = kp4;
console.log(authority.publicKey.toString());

let openOrdersPda: anchor.web3.PublicKey;
let openOrdersPdaBump: number;

console.log('testing new bid keypair');


describe('fermi-dex-new', () => {
    before(async () => {

       

    });
describe('#new_order', async () => {
    it('New order - buy @ 20', async () => {
        console.log('testing new bid')
      {
        //const provider = anchor.AnchorProvider.env();
        const rpcUrl = 'https://api.devnet.solana.com';  // You can replace this with the appropriate RPC URL for your network.
        const rpcUrlLocal = 'http://localhost:8899';
        const wallet = new anchor.Wallet(kp4);
        const conn = new Connection(rpcUrlLocal);
        const provider = new anchor.AnchorProvider(conn, wallet, anchor.AnchorProvider.defaultOptions());

        const program = new anchor.Program(IDL, programId, provider) //for existing prog
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
          console.log('testing new bid keypair');
        
        [openOrdersPda, openOrdersPdaBump] =
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from('open-orders', 'utf-8'),
              new anchor.web3.PublicKey(marketPda).toBuffer(),
              authority.publicKey.toBuffer(),
            ],
            new anchor.web3.PublicKey(programId),
          );
          
          const objectsToCheck = {
            openOrdersPda,
            market: marketPda,
            pcVault,
            coinMint,
            pcMint,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority.publicKey,
            pcpayer: authorityPcTokenAccount,
            coinpayer: authorityCoinTokenAccount,
          };

          for (const [key, value] of Object.entries(objectsToCheck)) {
            console.log(`${key}: Type - ${typeof value} (${value.constructor.name}), Value - ${value}`);
          }
        await program.methods
          .newOrder(
            { bid: {} },
            new anchor.BN(26),
            new anchor.BN(1),
            new anchor.BN(26),
            { limit: {} },
          )
          .accounts({
            openOrders: openOrdersPda,
            market: marketPda,
            coinVault,
            pcVault,
            coinMint: coinMint,
            pcMint: pcMint,
            payer: authorityPcTokenAccount,
            bids: bidsPda,
            asks: asksPda,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority.publicKey,
          })
          .signers([authority])
          .rpc();

        console.log('place limit order buy price: 20');
       
      }
    })
    })
});