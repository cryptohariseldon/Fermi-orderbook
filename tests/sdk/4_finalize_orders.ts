import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { IDL } from '../../target/types/fermi_dex';
import idl from "../../target/idl/fermi_dex.json";
import solblog_keypair from "/Users/zero/Developer/fermi/fermi-orderbook/target/deploy/fermi_dex-keypair.json"
const fs = require('fs');
import { Token } from '@solana/spl-token';
import * as BufferLayout from 'buffer-layout';
import { PublicKey, Connection } from '@solana/web3.js';
import BN from 'bn.js';
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

const {Keypair} = require("@solana/web3.js");
// const secretKey = JSON.parse(fs.readFileSync("/Users/zero/.config/solana/id.json"));
// const secretKeynew = JSON.parse(fs.readFileSync("/Users/dm/Documents/fermi_labs/basic/keypair2/keypair2.json"));

const secretKeyKp3 = JSON.parse(fs.readFileSync("./kp3/key.json"));
const secretKeyKp4 = JSON.parse(fs.readFileSync("./kp4/key.json"));

const kp3 = Keypair.fromSecretKey(new Uint8Array(secretKeyKp3));
const kp4 = Keypair.fromSecretKey(new Uint8Array(secretKeyKp4));

//const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
//const keypair = anchor.web3.Keypair.generate();

const authority = kp3;
const authority_second = kp4;

let openOrdersPda: anchor.web3.PublicKey;
let openOrdersPdaBump: number;
let openOrders_secondPda: anchor.web3.PublicKey;
let openOrders_secondPdaBump: number;


describe('fermi-dex-new', () => {
    before(async () => {
    });
    
describe('#finalize-order', async () => {
    it('Finalize order - sell @ 19 successful', async () => {
        console.log('testing new ask')
      {
        const rpcUrlLocal = 'http://localhost:8899';
        const wallet = new anchor.Wallet(authority_second);
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
            authority_second.publicKey,
            false,
          );
        
            console.log("openorders");

        [openOrdersPda, openOrdersPdaBump] =
          await anchor.web3.PublicKey.findProgramAddress(
            [
              Buffer.from('open-orders', 'utf-8'),
              new anchor.web3.PublicKey(marketPda).toBuffer(),
              authority.publicKey.toBuffer(),
            ],
            new anchor.web3.PublicKey(programId),
          );

          [openOrders_secondPda, openOrders_secondPdaBump] = 
          await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from('open-orders', 'utf-8'),
            new anchor.web3.PublicKey(marketPda).toBuffer(),
            authority_second.publicKey.toBuffer(),
          ],
          new anchor.web3.PublicKey(programId),
            );
          

          //let i = -1;
          //console.log(eventsQ2['buf'][1]);
          let order_id;
          let event_slot;
          /*
          for(let i=0; i<eventsQ2['buf'].length; i++){
            //i+=1;
            let event = eventsQ2['buf'][i];
            //console.log(event.flag);
            if (event.flags=="0x1"){
              const event_slot = i;
              const order_id = event.order_id;
            }
          } */
          let base_order_id = 498062089990157893629;
          let base_event_slot = 4;
          let base_event_slot2 = 6;
      
          console.log(base_order_id);
          console.log('test finalise match with event slot + order id');
          console.log(authorityCoinTokenAccount.toString());
          console.log(authorityPcTokenAccount.toString());

          const objectsToCheck = {
            openOrdersPda,
            openOrders_secondPda,
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

          const eventQ = await program.account.eventQueue.fetch(eventQPda);
          console.log(eventQ,(eventQ.buf as any[])?.map((item,i)=>({...item,idx:i})).filter(item => item.orderId !== new BN(0)));
          await program.methods
            .finaliseMatches(
              base_event_slot,
              base_event_slot2,
            )
            .accounts({
              openOrdersOwner: openOrdersPda,
              openOrdersCounterparty: openOrders_secondPda,
              market: marketPda,
              //coinVault,
              pcVault,
              coinMint: coinMint,
              pcMint: pcMint,
              //payer: authorityPcTokenAccount,
              //bids: bidsPda,
              //asks: asksPda,
              reqQ: reqQPda,
              eventQ: eventQPda,
              authority: authority.publicKey,
              pcpayer: authorityPcTokenAccount,
              coinpayer: authorityCoinTokenAccount,
            })
            .signers([authority])
            .rpc();

      }
    })
    })
});