import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { assert } from 'chai';
import { SimpleSerum } from '../../target/types/fermi_dex';
import idl from "../../target/idl/fermi_dex.json";
import solblog_keypair from "/Users/dm/Documents/blob_solana/wallet/fermi-orderbook/target/deploy/fermi_dex-keypair.json"
const fs = require('fs');
import { Token } from '@solana/spl-token';
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
  } from "./utils/constants";

const {Keypair} = require("@solana/web3.js");
const secretKey = JSON.parse(fs.readFileSync("/Users/dm/.config/solana/id.json"));

const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));


const authority = keypair;

let openOrdersPda: anchor.web3.PublicKey;
let openOrdersPdaBump: number;
async function fetchTokenBalance(mintAddress: string, userAddress: string) {
    const connection = new Connection("https://rpc-devnet.helius.xyz/?api-key=69bea66a-a716-416b-8a45-a9c7049b0731");
    const mintPublicKey = new PublicKey(mintAddress);
    const userPublicKey = new PublicKey(userAddress);
  
    let tokenBalance = await connection.getTokenAccountBalance(userPublicKey);
  
    console.log('Token balance:', tokenBalance);
    return tokenBalance;
  }

console.log('testing new bid keypair');
async function fetchTokenBalance2(mintAddress: string, associatedTokenAddress: string) {
    // Get the connection from the provider
    const provider = anchor.AnchorProvider.env();

    const connection = provider.connection;
  
    async function fetchTokenBalance(mintAddress: string, associatedTokenAddress: string) {
        // Create PublicKey objects for the mint and associated token address
        const mintPublicKey = new PublicKey(mintAddress);
        const associatedTokenPublicKey = new PublicKey(associatedTokenAddress);
      
        // Create a Token object for the token
        const token = new Token(provider.connection, mintPublicKey, spl.TOKEN_PROGRAM_ID, provider.wallet.payer);
      
        // Fetch the associated token account info
        const tokenAccountInfo = await token.getAccountInfo(associatedTokenPublicKey);
      
        // Log the balance
        console.log('Token balance:', tokenAccountInfo.amount.toString());
      }
  }
  /*
async function fetchTokenBalance(tokenMintAddress: string, userPublicKey: string) {
    // Create a PublicKey object for the user's address
    const userAddress = new PublicKey(userPublicKey);
  
    // Create a PublicKey object for the token's mint address
    const mintAddress = new PublicKey(tokenMintAddress);
  
    // Create a Token object for the token
    const token = new Token(connection, mintAddress, {}, {});
  
    // Fetch the user's token account info
    const tokenAccountInfo = await token.getAccountInfo(userAddress);
  
    // Log the balance
    console.log('Token balance:', tokenAccountInfo.amount.toString());
  }*/

describe('fermi-dex-new', () => {
    before(async () => {

       

    });
describe('#new_order', async () => {
    it('New order - buy @ 99 successful', async () => {
        console.log('testing new bid')
      {
        const provider = anchor.AnchorProvider.env();

        const program = new anchor.Program(idl, programId, provider) //for existing prog
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

          // set your orderid here
          const base_order_id = 498062089990157893629;

          //find if orderid has been filled
            
    let base_event_slot = 2;
    let base_event_slot2 = 4;

    console.log(base_order_id);
    console.log('test finalise match with event slot + order id');
    console.log(authorityCoinTokenAccount.toString());
    console.log(authorityPcTokenAccount.toString());
    await program.methods
      .finaliseMatches(
        base_event_slot,
        base_event_slot2,
        //pcVault,
        //coinVault,
        authorityPcTokenAccount,
        authorityCoinTokenAccount,
        //new anchor.BN(0),
        //authority.PublicKey,
      )
      .accounts({
        openOrdersOwner: openOrdersPda,
        openOrdersCounterparty: openOrdersPda,
        authority: authority.publicKey,
        market: marketPda,
        coinVault,
        pcVault,
        coinMint: coinMint.publicKey,
        pcMint: pcMint.publicKey,
        //payer: authorityPcTokenAccount,
        //bids: bidsPda,
        //asks: asksPda,
        reqQ: reqQPda,
        eventQ: eventQPda,
        pcpayer: authorityPcTokenAccount,
        coinpayer: authorityCoinTokenAccount,
      })
      .signers([authority])
      .rpc();

          /*
        await program.methods
          .newOrder(
            { bid: {} },
            new anchor.BN(20),
            new anchor.BN(1),
            new anchor.BN(20).mul(new anchor.BN(1000000)),
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
*/
        console.log('place limit order buy price: 99');
        const openOrders = await program.account.openOrders.fetch(
          openOrdersPda,
        );
        //console.log(openOrders);
        const bids = await program.account.orders.fetch(bidsPda);
        //console.log(bids);
        const asks = await program.account.orders.fetch(asksPda);
        //console.log(asks);
        const eventQ = await program.account.eventQueue.fetch(eventQPda);
        //console.log(eventQ);
        const pcbal = await fetchTokenBalance(pcMint, authorityPcTokenAccount.toString());
        const coinbal = await fetchTokenBalance(coinMint, authorityCoinTokenAccount.toString());
        console.log("Bid placed at price: 99 successful");
        console.log("PC token balance: {}", pcbal);  ;
        console.log("Coin token balance: {}", coinbal);  ; 
      }
    })
    })
});