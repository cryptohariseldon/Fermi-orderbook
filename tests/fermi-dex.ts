import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { assert } from 'chai';
import { SimpleSerum } from '../target/types/simple_serum';
import idl from "/Users/dm/Documents/blob_solana/fermi-orderbook/target/idl/simple_serum.json";
import solblog_keypair from "/Users/dm/Documents/blob_solana/fermi-orderbook/target/deploy/simple_serum-keypair.json"


const getDevPgmId = () => {
    // get the program ID from the solblog-keyfile.json
    let pgmKeypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(solblog_keypair)
    )
    return new anchor.web3.PublicKey(pgmKeypair.publicKey) // Address of the deployed program
}

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

const mintToCustom = async (
  provider: anchor.AnchorProvider,
  mint: anchor.web3.PublicKey,
  ta: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey,
  amount: bigint,
) => {
  const tx = new anchor.web3.Transaction();
  tx.add(
    spl.createMintToInstruction(
      mint,
      ta,
      owner,
      amount,
      [],
    ),
  );
  await provider.sendAndConfirm(tx, []);
};

describe(' fermi-dex', () => {
  const provider = anchor.AnchorProvider.env();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);
  //const programId = getDevPgmId();
  //const program = anchor.workspace.SimpleSerum as anchor.Program<SimpleSerum>; //for new deploy
  // let programId = "HTbkjiBvVXMBWRFs4L56fSWaHpX343ZQGzY4htPQ5ver";
  let programId = "D184GxrZpBJZVEBYLJbyAAkV1poev6LVaxbitWgeKLiY";

  const program = new anchor.Program(idl, programId, provider) //for existing prog
  const coinMint = anchor.web3.Keypair.generate();
  const pcMint = anchor.web3.Keypair.generate();

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

  const authority = anchor.web3.Keypair.generate();

  let authorityCoinTokenAccount: anchor.web3.PublicKey;
  let authorityPcTokenAccount: anchor.web3.PublicKey;

  console.log('basics done')

  before(async () => {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL,
      ),
    );

    await createMint(provider, coinMint, 9);
    await createMint(provider, pcMint, 6);
    //program.programId = "HTbkjiBvVXMBWRFs4L56fSWaHpX343ZQGzY4htPQ5ver";
    [marketPda, marketPdaBump] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('market', 'utf-8'),
        coinMint.publicKey.toBuffer(),
        pcMint.publicKey.toBuffer(),
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
          authority.publicKey.toBuffer(),
        ],
        program.programId,
      );

    coinVault = await spl.getAssociatedTokenAddress(
      coinMint.publicKey,
      marketPda,
      true,
    );
    pcVault = await spl.getAssociatedTokenAddress(
      pcMint.publicKey,
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
    const custom = new anchor.web3.PublicKey("ExPtCwVhSeChSc9Hqckxgssre1sUbCc8zRfy52A8B2fT");
    authorityCoinTokenAccount = await spl.getAssociatedTokenAddress(
      coinMint.publicKey,
      authority.publicKey,
      false,
    );
    authorityPcTokenAccount = await spl.getAssociatedTokenAddress(
      pcMint.publicKey,
      authority.publicKey,
      false,
    );
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
    await createAssociatedTokenAccount(
      provider,
      coinMint.publicKey,
      authorityCoinTokenAccount,
      authority.publicKey,
    );
    await createAssociatedTokenAccount(
      provider,
      pcMint.publicKey,
      authorityPcTokenAccount,
      authority.publicKey,
    );

    await mintTo(
      provider,
      coinMint.publicKey,
      authorityCoinTokenAccount,
      BigInt('10000000000'),
    );
    await mintTo(
      provider,
      pcMint.publicKey,
      authorityPcTokenAccount,
      BigInt('1000000000'),
    );
    console.log("sent to");
    console.log(authorityPcTokenAccount.toString());
    //MintTo custom
    /*
    const custom_ata_coin = new anchor.web3.PublicKey("4oy7v1heRg8WNN8bUznoRH8YjnYRZyQewVe7Byp9StjK");
    const custom_ata_pc = new anchor.web3.PublicKey("7e9vnc5d9sZcddPcETyyJQWumt5kTWbr27E55u9CWodh");
    await mintToCustom(
      provider,
      coinMint.publicKey,
      custom_ata_pc,
      provider.wallet.publicKey,
      BigInt('100000000000'),
    );

    console.log("sent to");
    console.log(custom_ata_pc.toString());

    await mintToCustom(
      provider,
      pcMint.publicKey,
      custom_ata_pc,
      provider.wallet.publicKey,
      BigInt('10000000000'),
    );

    console.log("sent to");
    console.log(custom_ata_pc.toString()); */
    //MintTo custom


  });

  describe('#initialize_market', async () => {
    it('should initialize market successfully', async () => {
    //  const market = await program.account.market.fetch(marketPda);

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

      const market = await program.account.market.fetch(marketPda);
      assert(market.coinVault.equals(coinVault));
      assert(market.pcVault.equals(pcVault));
      assert(market.coinMint.equals(coinMint.publicKey));
      assert(market.pcMint.equals(pcMint.publicKey));
      assert(market.coinDepositsTotal.eq(new anchor.BN(0)));
      assert(market.pcDepositsTotal.eq(new anchor.BN(0)));
      assert(market.bids.equals(bidsPda));
      assert(market.asks.equals(asksPda));
      assert(market.reqQ.equals(reqQPda));
      assert(market.eventQ.equals(eventQPda));
      assert(market.authority.equals(authority.publicKey));
    });
  });

  describe('#new_order', async () => {
    it('New order - buy @ 99 successful', async () => {
      {
        await program.methods
          .newOrder(
            { bid: {} },
            new anchor.BN(99),
            new anchor.BN(1),
            new anchor.BN(99).mul(new anchor.BN(1000000)),
            { limit: {} },
          )
          .accounts({
            openOrders: openOrdersPda,
            market: marketPda,
            coinVault,
            pcVault,
            coinMint: coinMint.publicKey,
            pcMint: pcMint.publicKey,
            payer: authorityPcTokenAccount,
            bids: bidsPda,
            asks: asksPda,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority.publicKey,
          })
          .signers([authority])
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
    }),
      it('New order - ask @ 100 successful', async () => {

      {
        await program.methods
          .newOrder(
            { ask: {} },
            new anchor.BN(100),
            new anchor.BN(1),
            new anchor.BN(100),
            { limit: {} },
          )
          .accounts({
            openOrders: openOrdersPda,
            market: marketPda,
            coinVault,
            pcVault,
            coinMint: coinMint.publicKey,
            pcMint: pcMint.publicKey,
            payer: authorityCoinTokenAccount,
            bids: bidsPda,
            asks: asksPda,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority.publicKey,
          })
          .signers([authority])
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
        const eventQ = await program.account.eventQueue.fetch(eventQPda);
        console.log(eventQ);
      }
}),
      it('New order - buy @ 101 successful', async () => {
      {
        await program.methods
          .newOrder(
            { bid: {} },
            new anchor.BN(101),
            new anchor.BN(1),
            new anchor.BN(101).mul(new anchor.BN(1000000)),
            { limit: {} },
          )
          .accounts({
            openOrders: openOrdersPda,
            market: marketPda,
            coinVault,
            pcVault,
            coinMint: coinMint.publicKey,
            pcMint: pcMint.publicKey,
            payer: authorityPcTokenAccount,
            bids: bidsPda,
            asks: asksPda,
            reqQ: reqQPda,
            eventQ: eventQPda,
            authority: authority.publicKey,
          })
          .signers([authority])
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
        const eventQ = await program.account.eventQueue.fetch(eventQPda);
        console.log(eventQ);
}

    }),
    it('finalise order - buy @ 101 successful', async () => {
    {
      const eventsQ2 = await program.account.eventQueue.fetch(eventQPda);
      //let i = -1;
      console.log(eventsQ2['buf'][1]);
      let order_id;
      let event_slot;
      console.log(authority);
      for(let i=0; i<eventsQ2['buf'].length; i++){
        //i+=1;
        let event = eventsQ2['buf'][i];
        console.log(event.flag);
        if (event.flags=="0x1"){
          const event_slot = i;
          const order_id = event.order_id;
        }
      }
      let base_order_id = 1844674407370955161601;
      let base_event_slot = 1;
      let base_event_slot2 = 2;

      console.log(base_order_id);
      console.log('test finalise match with event slot + order id');
      await program.methods
        .finaliseMatches(
          base_event_slot,
          base_event_slot2,
          new anchor.BN(0),
          authority.PublicKey,
        )
        .accounts({
          openOrdersOwner: openOrdersPda,
          openOrdersCounterparty: openOrdersPda,
          market: marketPda,
          coinVault,
          pcVault,
          coinMint: coinMint.publicKey,
          pcMint: pcMint.publicKey,
          //payer: authorityPcTokenAccount,
          bids: bidsPda,
          asks: asksPda,
          reqQ: reqQPda,
          eventQ: eventQPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      console.log('test finalise match with event slot + order id');
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
    };
  });
  });
});
