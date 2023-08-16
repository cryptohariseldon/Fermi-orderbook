import { airdropTo } from "./instructions/airdrop"
import { placeNewSellOrder } from "./instructions/createAsk"
import { placeNewBuyOrder } from "./instructions/createBid"
import { initializeMarket } from "./instructions/initializeMarket"
import { getLocalKeypair } from "./utils/getLocalKeypair"
import fs from "fs"

const main = async () => {
  const secretKeyPath = "/Users/zero/.config/solana/id.json"
  const programId = "DX5fj2BMuLwWEvJgrB2Z4JHsCWPDkB3c4Ev8aatrK6d2"

  if(!fs.existsSync("./tests/src/constants.ts")){
    console.log("Market constants file not found , initializing new market ....")
    const market = await initializeMarket(secretKeyPath,programId);
    console.log("New market intialized!!")
  }

  // AIRDROP 
  // console.log("------------------------")
  // console.log("LET'S START THE AIRDROP")
  // console.log("------------------------")
  
  
  const kp3 = getLocalKeypair("./kp3/key.json") // HubyrMHSh2s5KXeTYRFhYbY32hVPrG8bbAre2AzewqRR
  const kp4 = getLocalKeypair("./kp4/key.json") // EN31BH6XonqZdwZrMpqtgHcQ8supSZqVhBEE5GhmVrN6
  // await airdropTo(kp3);
  // await airdropTo(kp4);

  // PLACE LIMIT BUY ORDER -- BID
  const buyOrder = await placeNewBuyOrder(kp3,26);
  console.log(buyOrder.message)
  // PLACE LIMIT SELL ORDER -- ASK
  const sellOrder = await placeNewSellOrder(kp4,30)
  console.log(sellOrder.message)
}

main()