import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { assert } from 'chai';
import { FermiDex } from '../../target/types/fermi_dex';
import idl from "../../target/idl/fermi_dex.json";
const fs = require('fs');

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

  import {createAssociatedTokenAccount, mintTo} from "./utils/utils"

const {Keypair} = require("@solana/web3.js");


const secretKey = JSON.parse(fs.readFileSync("/Users/zero/.config/solana/id.json"));
const secretKeySecond = JSON.parse(fs.readFileSync("./kp3/key.json"));
const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
const keypair2 = Keypair.fromSecretKey(new Uint8Array(secretKeySecond));


const userpubkey = new anchor.web3.PublicKey('8oLBNnz2xWq6Mw5KX9PUELQEo92kBmkSoTZCBph5C5ju');

let authorityCoinTokenAccount: anchor.web3.PublicKey;
const authority = userpubkey;
let authorityPcTokenAccount: anchor.web3.PublicKey;

console.log("It's Bob's turn to get airdrops")
describe('fermi-dex-setup', () => {
  before(async () => {
  });
describe('create ATA and airdrop', async () => {
  const provider = anchor.AnchorProvider.env();
  it('creating ata for usdc and bonk and airdropping on devnet', async () => {
    // test code here
  
    authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(coinMint),
      authority,
      false,
    );

    authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authority,
      false,
    );

    console.log("dervei ATA done")

 // comment out if ATA is already created.
 
 
    await createAssociatedTokenAccount(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      authority,
    );
    
    await createAssociatedTokenAccount(
      provider,
      new anchor.web3.PublicKey(pcMint),
      authorityPcTokenAccount,
      authority,
    );   
 
    console.log("create ATA done")

    await mintTo(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      BigInt('10000000000'),


    );

    console.log("mint coin done")

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