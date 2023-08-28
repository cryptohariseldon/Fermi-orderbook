import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { createAssociatedTokenAccount } from '../utils/createAssociatedTokenAccount';
import { mintTo } from '../utils/mintTo';
import { PublicKey, Keypair, Connection } from '@solana/web3.js';
import { getLocalKeypair } from '../utils/getLocalKeypair';
import config from '../config';


export const airdropTo = async (userKp: Keypair) => {
  try {
    const { coinMint, pcMint } = require('../constants');
    if (!coinMint || !pcMint) throw new Error('Market constants not found');
    let authorityCoinTokenAccount: anchor.web3.PublicKey;
    const authority = userKp;
    let authorityPcTokenAccount: anchor.web3.PublicKey;

    const owner = getLocalKeypair('/Users/zero/.config/solana/id.json');
    const wallet = new anchor.Wallet(owner);
    const connection = new Connection(config.rpcUrl);
    const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions(),
    );

    // create token account 
    authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(coinMint),
      authority.publicKey,
      false,
    );


    await createAssociatedTokenAccount(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      authority.publicKey,
    ).then(()=> console.log("✅ Coin ATA created for ",userKp.publicKey.toString())).catch(err=>console.log(err));


    await mintTo(
      provider,
      new anchor.web3.PublicKey(coinMint),
      authorityCoinTokenAccount,
      BigInt('10000000000'),
    ).then(()=> console.log("✅ Coin tokens minted to ",userKp.publicKey.toString())).catch(err=>console.log(err))


    authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      new anchor.web3.PublicKey(pcMint),
      authority.publicKey,
      false,
    );

    await createAssociatedTokenAccount(
      provider,
      new anchor.web3.PublicKey(pcMint),
      authorityPcTokenAccount,
      authority.publicKey,
    ).then(()=> console.log("✅ Pc ATA created for ",userKp.publicKey.toString())).catch(err=>console.log(err));

    
    await mintTo(
      provider,
      new anchor.web3.PublicKey(pcMint),
      authorityPcTokenAccount,
      BigInt('1000000000'),
    ).then(()=> console.log("✅ Pc tokens minted to ",userKp.publicKey.toString())).catch(err=>console.log(err));

    console.log('Airdropped to ', authority.publicKey.toString(), '✅');
    return {
      authorityCoinTokenAccount,
      authorityPcTokenAccount,
    };
  } catch (err) {
    console.log('Something went wrong while airdropping .');
    console.log(err);
  }
}
