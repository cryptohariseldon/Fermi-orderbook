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

  import {createAssociatedTokenAccount, mintTo} from "../../addl_tes/fermi-dex"

const {Keypair} = require("@solana/web3.js");
const secretKey = JSON.parse(fs.readFileSync("/Users/dm/.config/solana/id.json"));

const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));

let authorityCoinTokenAccount :  anchor.web3.PublicKey;
const authority = keypair
let authorityPcTokenAccount : anchor.web3.PublicKey;
//let createAssociatedTokenAccount : anchor.web3.PublicKey;
//let minto : anchor.web3.PublicKey;
//let mintTo : anchor.web3.PublicKey
console.log("It's Bob's turn to get airdrops")
describe('create ATA and airdrop', async () => {
  const provider = anchor.AnchorProvider.env();
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

    await mintTo(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      BigInt('20000000000'),
    );
    await mintTo(
      provider,
      new anchor.web3.PublicKey(pcMint),
      authorityPcTokenAccount,
      BigInt('2000000000'),
    );
    console.log("sent to");
    console.log(authorityPcTokenAccount.toString());

    });