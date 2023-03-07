import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { assert } from 'chai';
import { SimpleSerum } from '../target/types/simple_serum';
import idl from "/Users/dm/Documents/blob_solana/wallet/Fermi-orderbook/target/idl/simple_serum.json";
import solblog_keypair from "/Users/dm/Documents/blob_solana/fermi-orderbook/target/deploy/simple_serum-keypair.json"

import { decodeEventQueue, decodeRequestQueue } from './queue';

//make sure this is executed with solblock keypair path (Fermi)
const getDevPgmId = () => {
    // get the program ID from the solblog-keyfile.json
    let pgmKeypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(solblog_keypair)
    )
    return new anchor.web3.PublicKey(pgmKeypair.publicKey) // Address of the deployed program
}


// Process setup and airdrops for Alice wallet
const createMint = async (
  provider: anchor.AnchorProvider,
  mint: anchor.web3.Keypair,
  decimal: number,
) => {
  //const programId = getDevPgmId();
  const tx = new anchor.web3.Transaction();
  tx.add(
    anchor.web3.SystemProgram.createAccount({
      programId: spl.TOKEN_PROGRAM_ID,
      //programId: programId,
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: spl.MintLayout.span,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        spl.MintLayout.span,
      ),
    }),
  );
  tx.add(
    spl.createInitializeMintInstruction(
      mint.publicKey,
      decimal,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
    ),
  );
  await provider.sendAndConfirm(tx, [mint]);
};

const createAssociatedTokenAccount = async (
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

const mintTo = async (
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

// setup wallet and associated token accounts for Bob wallet_account
// Process setup and airdrops for Viv wallet

// create
const createMintBob = async (
  provider: anchor.AnchorProvider,
  mint: anchor.web3.Keypair,
  decimal: number,
) => {
  //const programId = getDevPgmId();
  const tx = new anchor.web3.Transaction();
  tx.add(
    anchor.web3.SystemProgram.createAccount({
      programId: spl.TOKEN_PROGRAM_ID,
      //programId: programId,
      fromPubkey: authority_bob.PublicKey,
      newAccountPubkey: mint.publicKey,
      space: spl.MintLayout.span,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(
        spl.MintLayout.span,
      ),
    }),
  );
  tx.add(
    spl.createInitializeMintInstruction(
      mint.publicKey,
      decimal,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
    ),
  );
  await provider.sendAndConfirm(tx, [mint]);
};

console.log("create ATA");
const createAssociatedTokenAccountBob = async (
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

console.log("Mint to ATA");

const mintToBob = async (
  provider: anchor.AnchorProvider,
  mint: anchor.web3.PublicKey,
  ta: anchor.web3.PublicKey,
  auth: anchor.web3.PublicKey,
  amount: bigint,
) => {
  const tx = new anchor.web3.Transaction();
  tx.add(
    spl.createMintToInstruction(
      mint,
      ta,
      auth,
      amount,
      [auth],
    ),
  );
  await provider.sendAndConfirm(tx, [auth]);
};

//execute this on website opening (Fermi)
describe('simple-serum', () => {
  const provider = anchor.AnchorProvider.env();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  //const programId = getDevPgmId();
  //const program = anchor.workspace.SimpleSerum as anchor.Program<SimpleSerum>; //for new deploy
  let programId = "HTbkjiBvVXMBWRFs4L56fSWaHpX343ZQGzY4htPQ5ver";
  const program = new anchor.Program(idl, programId, provider) //for existing prog
  //const coinMint = anchor.web3.Keypair.generate();
  const coinMint = new anchor.web3.PublicKey("FLXU7NceNSZ1UJX4Qyx9KCwzMyQUHJw6pFnTcuWoz9zw");
  //const pcMint = anchor.web3.Keypair.generate();
  const pcMint = new anchor.web3.PublicKey("9Fz25i53XBim9wKBW2gNzsuGqTm9DrtpPh7YrtoBFopR")

  let coinVault: anchor.web3.PublicKey;
  let pcVault: anchor.web3.PublicKey;

  let marketPda: anchor.web3.PublicKey;
  let marketPdaBump: number;

  let bidsPda: anchor.web3.PublicKey;
  let bidsPdaBump: number;
  let asksPda: anchor.web3.PublicKey;
  let asksPdaBump: number;

  let reqQPda: anchor.web3.PublicKey;
  let reqQPdaBump: number;

  let eventQPda: anchor.web3.PublicKey;
  let eventQPdaBump: number;

  let openOrdersPda: anchor.web3.PublicKey;
  let openOrdersPdaBump: number;


  let openOrdersBobPda: anchor.web3.PublicKey;
  let openOrdersBobPdaBump: number;

  //const authority = anchor.web3.Keypair.generate();
  const authority = new anchor.web3.PublicKey("t49Apab6yTXpsmy8V5vQyUL9EPzDwsPsbAjet8JQQCZ")
  const authority_custom = anchor.web3.Keypair.generate();
  const authority_bob = anchor.web3.Keypair.generate();

  console.log("alice {}", authority);
  console.log("bob {}", authority_bob);

  let authorityCoinTokenAccount: anchor.web3.PublicKey;
  let authorityPcTokenAccount: anchor.web3.PublicKey;
  let authorityBobPcTokenAccount: anchor.web3.Pubkey;
  let authorityBobCoinTokenAccount: anchor.web3.Pubkey;


  console.log('basics done')

  //const program = anchor.workspace.Events;
  let listener = null;
  /*
  let [event, slot] = await new Promise((resolve, _reject) => {
    listener = program.addEventListener("MyEvent", (event, slot) => {
      resolve([event, slot]);
    });
    program.rpc.initialize();
  });
  await program.removeEventListener(listener);

  assert.isAbove(slot, 0);
  assert.strictEqual(event.data.toNumber(), 5);
  assert.strictEqual(event.label, "hello");*/

/*
  async loadEventQueue(connection: Connection) {
    const { data } = throwIfNull(
      await connection.getAccountInfo(this._decoded.eventQueue),
    );
    return decodeEventQueue(data);
  }; */


  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority_custom.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL,
      ),
    );

 console.log(provider.publicKey);
    //await createMint(provider, coinMint, 9);
    //await createMint(provider, pcMint, 6);
    //await createMintBob(provider, pcMint, 6);
    console.log("created mint");
    //execute from here on webpage openings (Fermi)
    //program.programId = "HTbkjiBvVXMBWRFs4L56fSWaHpX343ZQGzY4htPQ5ver";
    [marketPda, marketPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('market', 'utf-8'),
        coinMint.toBuffer(),
        pcMint.toBuffer(),
      ],
      program.programId,
    );

    [bidsPda, bidsPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('bids', 'utf-8'), marketPda.toBuffer()],
      program.programId,
    );
    [asksPda, asksPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('asks', 'utf-8'), marketPda.toBuffer()],
      program.programId,
    );

    [reqQPda, reqQPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('req-q', 'utf-8'), marketPda.toBuffer()],
      program.programId,
    );
    [eventQPda, eventQPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from('event-q', 'utf-8'), marketPda.toBuffer()],
      program.programId,
    );

    [openOrdersPda, openOrdersPdaBump] =
      await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from('open-orders', 'utf-8'),
          marketPda.toBuffer(),
          authority_custom.publicKey.toBuffer(),
        ],
        program.programId,
      );

      /*[openOrdersBobPda, openOrdersBobPdaBump] =
        await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from('open-orders', 'utf-8'),
            marketPda.toBuffer(),
            authority_bob.publicKey.toBuffer(),
          ],
          program.programId,
        );*/

    coinVault = await spl.getAssociatedTokenAddress(
      coinMint,
      marketPda,
      true,
    );
    pcVault = await spl.getAssociatedTokenAddress(
      pcMint,
      marketPda,
      true,
    );
    // await createAssociatedTokenAccount(
    //   provider,
    //   coinMint.publicKey,
    //   coinVault,
    //   marketPda,
    // );
    // await createAssociatedTokenAccount(
    //   provider,
    //   pcMint.publicKey,
    //   pcVault,
    //   marketPda,
    // );

    authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
      coinMint,
      authority_custom.publicKey,
      false,
    );
    authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      pcMint,
      authority_custom.publicKey,
      false,
    );
    console.log("bob incoming");

   /* authorityBobPcTokenAccount = await spl.getAssociatedTokenAddress(
      pcMint,
      authority_bob.publicKey,
      false,
    );

    authorityBobCoinTokenAccount = await spl.getAssociatedTokenAddress(
      coinMint,
      authority_bob.publicKey,
      false,
    ); */



    await createAssociatedTokenAccount(
      provider,
      coinMint,
      authorityCoinTokenAccount,
      authority_custom.publicKey,
    );
    await createAssociatedTokenAccount(
      provider,
      pcMint,
      authorityPcTokenAccount,
      authority_custom.publicKey,
    );
    console.log("created ATA");
    //console.log(authorityCoinTokenAccount);
    //console.log(authorityPcTokenAccount);
    // create ATA for Bob
    /*await createAssociatedTokenAccount(
      provider,
      pcMint,
      authorityBobPcTokenAccount,
      authority_bob.publicKey,
    );

    await createAssociatedTokenAccount(
      provider,
      coinMint,
      authorityBobCoinTokenAccount,
      authority_bob.publicKey,
    );*/


   await mintTo(
      provider,
      coinMint,
      authorityCoinTokenAccount,
      BigInt('10000000000'),
    );


    await mintTo(
      provider,
      pcMint,
      authorityPcTokenAccount,
      BigInt('1000000000'),
    );

    const custom = new anchor.web3.PublicKey("ExPtCwVhSeChSc9Hqckxgssre1sUbCc8zRfy52A8B2fT");
    console.log(custom)
    /*
    const customCoinTokenAccount = await spl.getAssociatedTokenAddress(
      coinMint.publicKey,
      custom,
      false,
    );
    const customPcTokenAccount = await spl.getAssociatedTokenAddress(
      pcMint.publicKey,
      custom,
      false,
    );

    console.log(customPcTokenAccount.toString());
*/

    const custom_ata_coin = new anchor.web3.PublicKey("H2cZK8LEgqEBUL52Px6fkTWMVAHrhVPi5VWwztRmRw6u");

    const custom_ata_pc = new anchor.web3.PublicKey("FHZwM7ssjwau2WfriJpf2yHSuUhxbgjcmySoGSV3x6Vx");
    await mintTo(
      provider,
      coinMint,
      custom_ata_coin,
      BigInt('100000000000'),
    );
    console.log("airdrop done");

    console.log("sent to");
    console.log(custom_ata_pc.toString());

    await mintTo(
      provider,
      pcMint,
      custom_ata_pc,
      BigInt('10000000000'),
    );

    console.log("minting PC tokens to Bob");
    // Mint pc tokens to bobs ATA
    /*
    await mintToBob(
      provider,
      pcMint.publicKey,
      authorityBobPcTokenAccount,
      authority_bob,
      BigInt('1000000000'),
    );*/


  });
//to be executed only once (Fermi)
  /*describe('#initialize_market', async () => {
    it('should initialize market successfully', async () => {
      await program.methods
        .initializeMarket(new anchor.BN('1000000000'), new anchor.BN('1000000'))
        .accounts({
          market: marketPda,
          coinVault,
          pcVault,
          coinMint: coinMint.publicKey,
          pcMint: pcMint.publicKey,
          bids: bidsPda,
          asks: asksPda,
          reqQ: reqQPda,
          eventQ: eventQPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

        //do this everytime (Fermi)
      const market = await program.account.market.fetch(marketPda);
      assert(market.coinVault.equals(coinVault));
      assert(market.pcVault.equals(pcVault));
      assert(market.coinMint.equals(coinMint.publicKey));
      assert(market.pcMint.equals(pcMint.publicKey));

      // remove equality to zero check
      assert(market.coinDepositsTotal.eq(new anchor.BN(0)));
      assert(market.pcDepositsTotal.eq(new anchor.BN(0)));
      assert(market.bids.equals(bidsPda));
      assert(market.asks.equals(asksPda));
      assert(market.reqQ.equals(reqQPda));
      assert(market.eventQ.equals(eventQPda));
      assert(market.authority.equals(authority.publicKey));
    });
  });*/
//steps to execute when there is new bid order (Fermi)
  describe('#new_order', async () => {
    it('New order - buy @ 99 successful', async () => {
      {
        await program.methods
          .newOrder(
            { bid: {} },
            new anchor.BN(105),
            new anchor.BN(1),
            new anchor.BN(105).mul(new anchor.BN(1000000)),
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
            authority: authority_custom.publicKey,
          })
          .signers([authority_custom])
          .rpc();

        console.log('place limit order buy price: 99');
        const openOrders = await program.account.openOrders.fetch(
          openOrdersPda,
        );
        console.log(openOrders);
        const bids = await program.account.orders.fetch(bidsPda);
        console.log(bids);
        const asks = await program.account.orders.fetch(asksPda);
        console.log(asks);
        const eventQ = await program.account.eventQueue.fetch(eventQPda);
        console.log(eventQ);
      }
    }), //steps to execute when placing new ask order (Fermi)
      it('New order - ask @ 100 successful', async () => {

      {
        await program.methods
          .newOrder(
            { ask: {} },
            new anchor.BN(110),
            new anchor.BN(1),
            new anchor.BN(110),
            { limit: {} },
          )
          .accounts({
            openOrders: openOrdersPda,
            market: marketPda,
            coinVault,
            pcVault,
            coinMint: coinMint,
            pcMint: pcMint,
            payer: authorityCoinTokenAccount,
            bids: bidsPda,
            asks: asksPda,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority_custom.publicKey,
          })
          .signers([authority_custom])
          .rpc();

        console.log('place limit order ask price: 100');
        const openOrders = await program.account.openOrders.fetch(
          openOrdersPda,
        );
        console.log(openOrders);
        const bids = await program.account.orders.fetch(bidsPda);
        console.log(bids);
        const asks = await program.account.orders.fetch(asksPda);
        console.log(asks);
        console.log("eventQ");
        const eventQ = await program.account.eventQueue.fetch(eventQPda);
        console.log(eventQ);
      }
}),
      it('New order - buy @ 101 successful', async () => {
      {
        //console.log(authorityBobPcTokenAccount.PublicKey);
        const eventQ = await program.account.eventQueue.fetch(eventQPda);
        const lol = eventQ['buf'][1];
        console.log("warp");
        console.log(lol);
        await program.methods
          .newOrder(
            { bid: {} },
            new anchor.BN(103),
            new anchor.BN(1),
            new anchor.BN(103).mul(new anchor.BN(1000000)),
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
            authority: authority_custom.publicKey,
          })
          .signers([authority_custom])
          .rpc();

        console.log('place limit order buy price: 101');
        const openOrders = await program.account.openOrders.fetch(
          openOrdersPda,
        );
        console.log(openOrders);
        const bids = await program.account.orders.fetch(bidsPda);
        console.log(bids);
        const asks = await program.account.orders.fetch(asksPda);
        console.log(asks);
        //const eventQ = await program.account.eventQueue.fetch(eventQPda);
        //console.log(eventQ);
/*
        for (p in eventQ) {
          console.log(p);
        } */
        // const x = Buffer.from(eventQ.buf);
      };
    });
  });
});
