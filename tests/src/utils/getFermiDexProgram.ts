import * as anchor from '@project-serum/anchor';
import { Connection } from '@solana/web3.js';
import { Keypair } from "@solana/web3.js"; // if needed for getLocalKeypair function
import { getLocalKeypair } from "./getLocalKeypair";
import config from '../config';
import { FermiDex, IDL } from '../../../target/types/fermi_dex';

function getFermiDexProgram(keypair:Keypair): anchor.Program<FermiDex> {
  const  {programId} = require('../constants');
  const authority = keypair;
  const wallet = new anchor.Wallet(authority);
  const connection = new Connection(config.rpcUrl);
  const provider = new anchor.AnchorProvider(
      connection,
      wallet,
      anchor.AnchorProvider.defaultOptions(),
  );

  return new anchor.Program(IDL, programId, provider);
}

export default getFermiDexProgram