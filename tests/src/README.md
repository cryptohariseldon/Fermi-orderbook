# Steps to setup sdk testing 

1. First deploy program , get the program id then modify the config.ts file with new program id and your local keypair path
```
const config = {
  programId:"YOUR_PROGRAM_ID",
  rpcUrl:"http://127.0.0.1:8899", 
  localKpPath : "YOUR_LOCAL_KEYPAIR_PATH" // Eg: "/Users/zero/.config/solana/id.json"
}
```
2. To initialize new market and generate constants , go to `tests/src/index.ts` . comment out `main()` and uncomment `createNewMarket()`, then  run `anchor test --skip-local-validator` 
```
createNewMarket()
// main()
```
3. After market has been initialized and you can see new contants file generated in `tests/src/constants.ts` , now comment out `createNewMarket()` and uncomment `main()`, and test instructions in `main()` function and run `anchor test --skip-local-validator` to run the index.ts file
```
//createNewMarket()
main()
```

NOTE : The `test` script in Anchor.toml has been modified to run only the `test/src/index.ts` file so consider it as an entry point to simulate the market. 

Also don't forget to modify `Anchor.toml` and `lib.rs` and replace with your deployed programId and local keypair path.

   
 
---
BUY = BID 
SELL = ASK 

---

EVENT FLAGS 

0x1 : Fill is represented by the bit 0x1, which is the binary value 0000 0001.
0x2 : Out is represented by the bit 0x2, which is the binary value 0000 0010.
0x4 : Bid is represented by the bit 0x4, which is the binary value 0000 0100.
0x8 : Maker is represented by the bit 0x8, which is the binary value 0000 1000.
0x10 : ReleaseFunds is represented by the bit 0x10, which is the binary value 0001 0000.
0x20 : Finalise is represented by the bit 0x20, which is the binary value 0010 0000.
0x12 : Both bid & maker event flag 

0x13 : fill + bid + maker
---

NOTES 

1. Initialize market 
2. Create associated token accounts and airdrop tokens 
3. kp4 places bid / buy order at 26 ( buy coins using pc tokens )
4. kp3 places ask / sell order at 25 ( sell coins to get pc tokens )
5. Finalize 
providerWallet = kp4
authorityPcTokenAccount = kp4 (access to buyers pc token )
authorityCoinToken = kp3 ( access to sellers coin tokens)
oldEventSlot = 3
latestEventSlot = 5

// bid order of kp4 is finalized by kp3 side
finalizeMatchesBid(oldEventSlot,latestEventSlot).accounts(
  openOrdersOwner: kp3
  openOrdersCounterparty : kp4
  authority : kp3 
).signer([kp3])


finalizeMatchesBid(oldEventSlot,latestEventSlot).accounts(
  openOrdersOwner: kp3
  openOrdersCounterparty : kp4
  authority : kp3 
).signer([kp3])




kp4 bid/buy order id : 498062089990157893631
kp3 ask/sell order id : 461168601842738790402
kp3 open orders : 8CUtCz42jzAf7owMWNXFLZ2X9dkGMxbKnxGTviofxB1v
kp4 open orders : BHSMMnirvwAZLCaKQoQREFFDPo4tYzJK8bTAD5VrFjzy

maker event = 3 (owned by kp4 / maker)
taker event = 5 (owned by kp3 / taker)


