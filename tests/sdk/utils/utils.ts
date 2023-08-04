

import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { assert } from 'chai';

const fs = require('fs');

export const createAssociatedTokenAccount = async (
    provider: anchor.AnchorProvider,
    mint: anchor.web3.PublicKey,
    ata: anchor.web3.PublicKey,
    owner: anchor.web3.PublicKey,
  ) => {
    const tx = new anchor.web3.Transaction();
    tx.add(
      spl.createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        ata,
        owner,
        mint,
      ),
    );
    await provider.sendAndConfirm(tx, []);
  };
  
  export const mintTo = async (
    provider: anchor.AnchorProvider,
    mint: anchor.web3.PublicKey,
    ta: anchor.web3.PublicKey,
    amount: bigint,
  ) => {
    const tx = new anchor.web3.Transaction();
    tx.add(
      spl.createMintToInstruction(
        mint,
        ta,
        provider.wallet.publicKey,
        amount,
        [],
      ),
    );
    await provider.sendAndConfirm(tx, []);
  };