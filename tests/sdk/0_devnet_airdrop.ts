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

  import {createAssociatedTokenAccount, mintTo} from "./utils/utils"

const {Keypair} = require("@solana/web3.js");
const secretKey = JSON.parse(fs.readFileSync("/Users/dm/.config/solana/id.json"));
const secretKeynew = JSON.parse(fs.readFileSync("/Users/dm/Documents/fermi_labs/basic/keypair2/keypair2.json"));


const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

//HARDCODE YOUR DEVNET PUBKEY HERE TO RECIEVE AIRDROPS
const userpubkey = new anchor.web3.PublicKey('EghF9PfBssprkzYv3tg4H6RC1QdmQth4NFds1QFepXtB');
const keypair2 = Keypair.fromSecretKey(new Uint8Array(secretKeynew));

let authorityCoinTokenAccount: anchor.web3.PublicKey;
const authority = keypair2;
let authorityPcTokenAccount: anchor.web3.PublicKey;
//let createAssociatedTokenAccount : anchor.web3.PublicKey;
//let minto : anchor.web3.PublicKey;
//let mintTo : anchor.web3.PublicKey
console.log("It's Bob's turn to get airdrops")
describe('fermi-dex-setup', () => {
  before(async () => {
    // Add your before hook here.
  });
describe('create ATA and airdrop', async () => {
  const provider = anchor.AnchorProvider.env();
  it('creating ata for usdc and bonk and airdropping on devnet', async () => {
    // test code here
  
    authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(coinMint),
      authority.publicKey,
      false,
    );
    authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authority.publicKey,
      false,
    );

    console.log("dervei ATA done")

 // comment out if ATA is already created.
 
    await createAssociatedTokenAccount(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      authority.publicKey,
    );
    await createAssociatedTokenAccount(
      provider,
      new anchor.web3.PublicKey(pcMint),
      authorityPcTokenAccount,
      authority.publicKey,
    ); 

    console.log("create ATA done")

    await mintTo(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      BigInt('10000000000'),
    );
    await mintTo(
      provider,
      new anchor.web3.PublicKey(pcMint),
      authorityPcTokenAccount,
      BigInt('1000000000'),
    );
    console.log("sent to");
    console.log(authorityPcTokenAccount.toString());

    });
  })});