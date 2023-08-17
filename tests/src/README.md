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

   
 
