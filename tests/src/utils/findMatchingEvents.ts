type Event = {
  idx: number;
  orderId: string;
  orderIdSecond: string;
  owner: string;
  eventFlags: number;
  ownerSlot: number;
  finalised: number;
  nativeQtyReleased: string;
  nativeQtyPaid: string;
};

type OrderMatch = {
  orderIdMatched?: Event;
  orderIdSecondMatched?: Event;
};

// export const findMatchingEvents1 = (orderIds: string[], events: Event[]) => {

//   const map = new Map<string,OrderMatch>();
//   for (let orderId of orderIds) {
//     if(orderId === "0") return;
//     let orderIdMatched;
//     let orderIdSecondMatched;
//     console.log("Finding Matching events for order ",orderId);
//     for(let e of events){
//       // filter out invalid events
//       if(e.orderId === orderId && e.nativeQtyReleased !== '0'){
//         orderIdMatched = e
//         // console.log("orderIdMatched",orderIdMatched)
//       }

//       if(e.orderIdSecond === orderId && e.nativeQtyReleased !== '0'){
//         orderIdSecondMatched = e
//         // console.log("orderIdSecondMatched",orderIdSecondMatched)
//       }

//     }
//     // if we have both orderId matched and orderIdSecond matched events then
 
//     if(orderIdMatched && orderIdSecondMatched){
//       console.log(`Found a match for ${orderId} = ${orderIdMatched.idx} : ${orderIdSecondMatched.idx}`,)
//       map.set(orderId,{orderIdMatched,orderIdSecondMatched});
//     }
//   }

//   console.log(map);
// };


export const findMatchingEvents = (orderIds: string[], events: Event[]):Map<string, OrderMatch> => {
  const orderIdMap = new Map<string, Event>();
  const orderIdSecondMap = new Map<string, Event>();

  // Pre-process events into separate maps
  for (const e of events) {
    if (e.nativeQtyReleased !== '0') {
      if (!orderIdMap.has(e.orderId)) {
        orderIdMap.set(e.orderId, e);
      }
      if (!orderIdSecondMap.has(e.orderIdSecond)) {
        orderIdSecondMap.set(e.orderIdSecond, e);
      }
    }
  }

  const matchedEvents = new Map<string, OrderMatch>();
  for (const orderId of orderIds) {
    if (orderId === '0') continue;

    const orderIdMatched = orderIdMap.get(orderId);
    const orderIdSecondMatched = orderIdSecondMap.get(orderId);

    if (orderIdMatched && orderIdSecondMatched) {
      // console.log(`Found a match for ${orderId} = ${orderIdMatched.idx} : ${orderIdSecondMatched.idx}`);
      matchedEvents.set(orderId, { orderIdMatched, orderIdSecondMatched });
    }
  }

  return matchedEvents
};





