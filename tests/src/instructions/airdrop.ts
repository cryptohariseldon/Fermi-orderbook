import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { createAssociatedTokenAccount } from '../utils/createAssociatedTokenAccount';
import { mintTo } from '../utils/mintTo';
import { coinMint, pcMint } from '../constants';
import {PublicKey,Keypair,Connection} from "@solana/web3.js"
import { getLocalKeypair } from '../utils/getLocalKeypair';
import config from '../config';
/**
 * Set up an airdrop on the Solana blockchain using the anchor framework.
 * 
 * @param userKp - Keypair of user to which tokens will be airdropped
 * @returns An object containing the authority coin and pc token accounts.
 */
export async function airdropTo(
    userKp: Keypair
) {
    try{
    let authorityCoinTokenAccount: anchor.web3.PublicKey;
    const authority = userKp;
    let authorityPcTokenAccount: anchor.web3.PublicKey;

    const owner = getLocalKeypair("/Users/zero/.config/solana/id.json")
    const wallet = new anchor.Wallet(owner);
    const connection = new Connection(config.rpcUrl);
    const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());

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
        BigInt('10000000000'),
    );

    await mintTo(
        provider,
        new anchor.web3.PublicKey(pcMint),
        authorityPcTokenAccount,
        BigInt('1000000000'),
    );

    console.log("Airdropped to ",authority.publicKey.toString(), "✅")
    return {
        authorityCoinTokenAccount,
        authorityPcTokenAccount
    };
    } catch(err){
        console.log("Something went wrong while airdropping .")
        console.log(err)
    }   
}
