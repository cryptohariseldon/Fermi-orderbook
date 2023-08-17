import { IDL } from "../../../target/types/fermi_dex";
import config from "../config";
import * as anchor from "@project-serum/anchor"
import { getLocalKeypair } from "./getLocalKeypair";
import {Connection} from "@solana/web3.js"


const parseEventQ = (eventQ) => {
  let events = []
  for(let i = 0;i<(eventQ.buf as any[]).length;i++){
    const e = eventQ.buf[i];
    if(e.orderId.toString() === '0') continue
    let event = {}
    event['idx'] = i;
    event['orderId'] = e.orderId.toString()
    event['orderIdSecond'] = e.orderIdSecond.toString();
    event['owner'] = e.owner.toString();
    event['eventFlags'] = e.eventFlags
    event['ownerSlot'] = e.ownerSlot
    event['finalised'] = e.finalised 
    event['nativeQtyReleased'] = e.nativeQtyReleased.toString()
    event['nativeQtyPaid'] = e.nativeQtyPaid.toString()
    events.push(event)
  }
  return events;
}


export async function getEventQ(){
  const {eventQPda} = require('../constants')
  const localKp = getLocalKeypair('/Users/zero/.config/solana/id.json')
  const connection = new Connection(config.rpcUrl);
  const wallet = new anchor.Wallet(localKp);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet,
    anchor.AnchorProvider.defaultOptions(),
  );
  const program = new anchor.Program(IDL, config.programId, provider);
  const eventQ = await program.account.eventQueue.fetch(eventQPda);

  return parseEventQ(eventQ);

}