use anchor_lang::{prelude::*, accounts::account_info};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, Transfer, Approve},
};
//use solana_sdk::instruction::{AccountMeta, Instruction};

use anchor_spl::token::accessor::authority;
use enumflags2::{bitflags, BitFlags};
use resp;
//extern crate bitflags;


declare_id!("4jde1a6MyoiwLVqB6UH5mBJp3gbpk1wcth8TZJfnf1V9");
//local
//declare_id!("HViUPBVkNo9v9y24N7qForgibiGGT3vQgbHjJnaScBMW");

#[program]
pub mod fermi_dex {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        coin_lot_size: u64,
        pc_lot_size: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        //let market = &mut ctx.accounts.market;
        market.coin_vault = ctx.accounts.coin_vault.key();
        market.pc_vault = ctx.accounts.pc_vault.key();
        market.coin_mint = ctx.accounts.coin_mint.key();
        market.pc_mint = ctx.accounts.pc_mint.key();
        market.coin_lot_size = coin_lot_size;
        market.pc_lot_size = pc_lot_size;
        market.coin_deposits_total = 0;
        market.pc_deposits_total = 0;
        market.bids = ctx.accounts.bids.key();
        market.asks = ctx.accounts.asks.key();
        market.req_q = ctx.accounts.req_q.key();
        market.event_q = ctx.accounts.event_q.key();
        market.authority = ctx.accounts.authority.key();

        Ok(())
    }

    pub fn cancel_bid(
        ctx: Context<CancelOrder>,
        order_id: u128,
        expected_owner: Pubkey,
    ) -> Result<()> {
        let bids = &mut ctx.accounts.bids;
        let event_q = &mut ctx.accounts.event_q.load_mut();
        let openorders = &mut ctx.accounts.open_orders;
        let authority = ctx.accounts.authority.key();

        //check openorders owner
         
        require!(openorders.authority == authority, ErrorCode::OrderNotFound);

        //check the order is owned by this user
        let mut x = 0;
        let mut slot: usize = 0;
        for (i, order) in openorders.orders.iter().enumerate() {
            let mut order_int = *order;
            if order_int == order_id {
                x = 1;
                slot = i;
            }
        }
        require!(x == 1, ErrorCode::OrderNotFound); 

        //remove order from orderbook
        let mut order_book = OrderBook {
            bids,
            asks: &mut ctx.accounts.asks,
            market: &mut ctx.accounts.market,
        };

        order_book.cancel_order_bid(true, order_id, expected_owner)?;

        //remove order from openorders
        //let res, err = openorders.remove_order(slot.try_into().unwrap());
        openorders.remove_order(slot.try_into().map_err(|_| ErrorCode::OrderNotFound)?)?;


        msg!("cancelled bid: {}", order_id);
        Ok(())
    }


        
    

    pub fn cancel_ask(
        ctx: Context<CancelOrder>,
        order_id: u128,
        expected_owner: Pubkey,
    ) -> Result<()> {
        let asks = &mut ctx.accounts.asks;
        let event_q = &mut ctx.accounts.event_q.load_mut();
        let openorders = &mut ctx.accounts.open_orders;
        let authority = ctx.accounts.authority.key();


        //check openorders owner
        require!(openorders.authority == authority, ErrorCode::OrderNotFound);

        //check the order is owned by this user
        let mut x = 0;
        let mut slot: usize = 0;
        for (i, order) in openorders.orders.iter().enumerate() {
            let mut order_int = *order;
            if order_int == order_id {
                x = 1;
                slot = i;
            }
        }
        require!(x == 1, ErrorCode::OrderNotFound); 

        let mut order_book = OrderBook {
            bids: &mut ctx.accounts.bids,
            asks,
            market: &mut ctx.accounts.market,
        };

        order_book.cancel_order_ask(false, order_id, expected_owner)?;


        //remove order from openOrders
        openorders.remove_order(slot.try_into().map_err(|_| ErrorCode::OrderNotFound)?)?;

        msg!("cancelled ask: {}", order_id);


        Ok(())
    }

    pub fn deposit_pc_tokens(
        ctx: Context<DepositTokens>,
        amount: u64,
    ) -> Result<()> {
        // Construct the transfer instruction
        msg!("Starting deposit_tokens function");
  
        let token_program = &ctx.accounts.token_program;

        let transfer_ix = Transfer {
            from: ctx.accounts.payer.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_ix); 
        msg!("Transferred tokens!");
        
        // Execute the transfer
        anchor_spl::token::transfer(cpi_ctx, amount).map_err(|err| match err {
            _ => error!(ErrorCode::TransferFailed),
        })?; 
        
        
        ctx.accounts.open_orders.native_pc_free = ctx.accounts
            .open_orders
            .native_pc_free
            .checked_add(amount)
            .ok_or(ErrorCode::Error)?;
        
        Ok(())
    }

    pub fn deposit_coin_tokens(
        ctx: Context<DepositTokens>,
        amount: u64,
    ) -> Result<()> {
        // Construct the transfer instruction
        let token_program = &ctx.accounts.token_program;

        let transfer_ix = Transfer {
            from: ctx.accounts.payer.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_ix);
        msg!("Transferred tokens!");
        
        // Execute the transfer
        anchor_spl::token::transfer(cpi_ctx, amount).map_err(|err| match err {
            _ => error!(ErrorCode::TransferFailed),
        })?;
        
        // Credit the balance to openOrders
        ctx.accounts.open_orders.native_coin_free = ctx.accounts
            .open_orders
            .native_coin_free
            .checked_add(amount)
            .ok_or(ErrorCode::Error)?;
        
        Ok(())
    }

     pub fn withdraw_coins(
        ctx: Context<WithdrawTokens>,
        amount: u64,
    ) -> Result<()> {
        let program_id = ctx.program_id;
        let open_orders = &mut ctx.accounts.open_orders;
        let market = &mut ctx.accounts.market;
        let coin_vault = &ctx.accounts.coin_vault;
        let pc_vault = &ctx.accounts.pc_vault;
        let payer = &ctx.accounts.payer;
        
        let authority = &ctx.accounts.authority;
        let token_program = &ctx.accounts.token_program;
        let coin_mint = &ctx.accounts.coin_mint;
        let pc_mint = &ctx.accounts.pc_mint;
        let (market_pda, bump_seed) = Pubkey::find_program_address(
            &[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref()],
            &program_id
        );

        //Validation: owner of openorders is the authority
        require!(open_orders.authority == authority.key(), ErrorCode::InvalidAuthority);

       //Validation of the user's openorders balance
        require!(open_orders.native_coin_free >= amount, ErrorCode::InsufficientFunds);


       // Signing the transaction with the market PDA and bump seed.
        let market_seed = b"market";
        
        let coin_mint_key = coin_mint.key();
        let pc_mint_key = pc_mint.key();

        let coin_mint_seed = coin_mint_key.as_ref();
        let pc_mint_seed = pc_mint_key.as_ref();

        let bump_seed_arr: &[u8] = &[bump_seed];

        let seed_slices: [&[u8]; 4] = [market_seed, coin_mint_seed, pc_mint_seed, bump_seed_arr];
        let seeds: &[&[&[u8]]] = &[&seed_slices];


        let transfer_ix = Transfer {
            from: coin_vault.to_account_info(),
            to: payer.to_account_info(),
            authority: market.to_account_info(),  // Using the market PDA as the authority.
        };
    
        // Construct the context with the market PDA and bump seed.
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_ix,
            seeds,
            //&[&[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref(), &[seeds]]]
        );
    
        anchor_spl::token::transfer(cpi_ctx, amount).map_err(|err| match err {
            _ => error!(ErrorCode::TransferFailed),
        })?;
        msg!("tokens withdrawn");

        // Reduce balance from user's OpenOrders account
        open_orders.native_coin_free = open_orders.native_coin_free.checked_sub(amount).ok_or(ErrorCode::Error)?;

        Ok(())
    }

    pub fn withdraw_tokens(
        ctx: Context<WithdrawTokens>,
        amount: u64,
    ) -> Result<()> {
        let program_id = ctx.program_id;
        let open_orders = &mut ctx.accounts.open_orders;
        let market = &mut ctx.accounts.market;
        let coin_vault = &ctx.accounts.coin_vault;
        let pc_vault = &ctx.accounts.pc_vault;
        let payer = &ctx.accounts.payer;
        
        let authority = &ctx.accounts.authority;
        let token_program = &ctx.accounts.token_program;
        let coin_mint = &ctx.accounts.coin_mint;
        let pc_mint = &ctx.accounts.pc_mint;
        let (market_pda, bump_seed) = Pubkey::find_program_address(
            &[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref()],
            &program_id
        );

        // Validation: owner of openorders is the authority
        require!(open_orders.authority == authority.key(), ErrorCode::InvalidAuthority);

        // Validation of the user's openorders balance
        require!(open_orders.native_pc_free >= amount, ErrorCode::InsufficientFunds);
       

       // Signing the transaction with the market PDA and bump seed.
        let market_seed = b"market";
        
        let coin_mint_key = coin_mint.key();
        let pc_mint_key = pc_mint.key();

        let coin_mint_seed = coin_mint_key.as_ref();
        let pc_mint_seed = pc_mint_key.as_ref();

        let bump_seed_arr: &[u8] = &[bump_seed];

        let seed_slices: [&[u8]; 4] = [market_seed, coin_mint_seed, pc_mint_seed, bump_seed_arr];
        let seeds: &[&[&[u8]]] = &[&seed_slices];

        let transfer_ix = Transfer {
            from: pc_vault.to_account_info(),
            to: payer.to_account_info(),
            authority: market.to_account_info(),  // Using the market PDA as the authority.
        };
    
        // Construct the context with the market PDA and bump seed.
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_ix,
            seeds,
            //&[&[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref(), &[seeds]]]
        );
    
        anchor_spl::token::transfer(cpi_ctx, amount).map_err(|err| match err {
            _ => error!(ErrorCode::TransferFailed),
        })?;
        msg!("tokens withdrawn");

        // Reduce balance from user's OpenOrders account
        open_orders.native_pc_free = open_orders.native_pc_free.checked_sub(amount).ok_or(ErrorCode::Error)?;

        Ok(())
    }





    pub fn new_order(
        ctx: Context<NewOrder>,
        side: Side,
        limit_price: u64,
        max_coin_qty: u64,
        max_native_pc_qty: u64,
        order_type: OrderType,
    ) -> Result<()> {
        let open_orders = &mut ctx.accounts.open_orders;
        let market = &mut ctx.accounts.market;
        let coin_vault = &ctx.accounts.coin_vault;
        let pc_vault = &ctx.accounts.pc_vault;
        let payer = &ctx.accounts.payer;
        let bids = &mut ctx.accounts.bids;
        let asks = &mut ctx.accounts.asks;
        let req_q = &mut ctx.accounts.req_q;
        let event_q = &mut ctx.accounts.event_q.load_mut();
        let authority = &ctx.accounts.authority;
        let token_program = &ctx.accounts.token_program;
        let coin_mint = &ctx.accounts.coin_mint;
        let pc_mint = &ctx.accounts.pc_mint;


        if !open_orders.is_initialized {
            open_orders.init(market.key(), authority.key())?;
        } else {
            require!(
                open_orders.market.key() == market.key(),
                ErrorCode::WrongMarket
            );
            require!(
                open_orders.authority.key() == authority.key(),
                ErrorCode::WrongAuthority
            );
        }
        
        let deposit_amount;
        let deposit_vault;
        let cpty_vault;
        let native_pc_qty_locked;
        match side {
            Side::Bid => {
                let lock_qty_native = max_native_pc_qty;
                native_pc_qty_locked = Some(lock_qty_native);
                let free_qty_to_lock = lock_qty_native.min(open_orders.native_pc_free);
                let total_deposit_amount = lock_qty_native - free_qty_to_lock;
                //deposit_amount = total_deposit_amount * 2/100; //marginal deposit up front
                deposit_amount = total_deposit_amount; //for test with matching, L1044
                deposit_vault = pc_vault;
                cpty_vault = coin_vault;
                
                market.pc_deposits_total = market
                    .pc_deposits_total
                    .checked_add(deposit_amount)
                    .unwrap();
            }
            Side::Ask => {
                native_pc_qty_locked = None;
                let lock_qty_native = max_coin_qty
                    .checked_mul(market.coin_lot_size)
                    .ok_or(error!(ErrorCode::InsufficientFunds))?;
                let free_qty_to_lock = lock_qty_native.min(open_orders.native_coin_free);
                let total_deposit_amount = lock_qty_native - free_qty_to_lock;
                //deposit_amount = total_deposit_amount * 2/100; //marginal deposit up front
                deposit_amount = total_deposit_amount; //for test with matching, L1044
                deposit_vault = coin_vault;
                cpty_vault = pc_vault;
               
                market.coin_deposits_total = market
                    .coin_deposits_total
                    .checked_add(deposit_amount)
                    .unwrap();
            }
        }

        let order_id = req_q.gen_order_id(limit_price, side);
        if open_orders.free_slot_bits == 0 {
            open_orders.remove_order(0);
        }
        let owner_slot = open_orders.add_order(order_id, side)?;
        let request = RequestView::NewOrder {
            side,
            order_type,
            order_id,
            owner: open_orders.key(),
            owner_slot,
            max_coin_qty,
            native_pc_qty_locked,
        };
        let jitdata: Vec<JitStruct> = vec![];
        let mut proceeds = RequestProceeds {
            coin_unlocked: 0,
            native_pc_unlocked: 0,
            coin_credit: 0,
            native_pc_credit: 0,
            coin_debit: 0,
            native_pc_debit: 0,
            jit_data: jitdata,
        };
        let mut order_book = OrderBook { bids, asks, market };

        // matching occurs at this stage
        order_book.process_request(&request, &mut event_q.as_mut().unwrap(), &mut proceeds)?;
        //msg!(event_q[1].side);
        //let jit_data = vec![];

        {
            let coin_lot_size = market.coin_lot_size;

            let RequestProceeds {
                coin_unlocked,
                coin_credit,

                native_pc_unlocked,
                native_pc_credit,

                coin_debit,
                native_pc_debit,
                jit_data,
            } = proceeds;
            let native_coin_unlocked = coin_unlocked.checked_mul(coin_lot_size).unwrap();
            let native_coin_credit = coin_credit.checked_mul(coin_lot_size).unwrap();
            let native_coin_debit = coin_debit.checked_mul(coin_lot_size).unwrap();

          

            let others = jit_data;
            


            msg!("going to loop!");
            for p in others {
                msg!("heya {}", p.owner);
                let mut owner_slot = p.owner_slot;
                msg!("this is the way {}", owner_slot);
                let mut owner_order = open_orders.orders[usize::from(owner_slot)];
                //let qty = owner_order.qty;
                let mut deposits = p.native_qty_paid;
                //let mut owner_deposits = owner_order.deposits;
                msg!("owner qty {}", owner_order);
                msg!("dep {}", deposits);
}
               //_orders_mut.native_pc_free <= open_orders_mut.native_pc_total)?;
        }


        let matched_amount_pc = proceeds.native_pc_credit;
        let matched_amount_coin = proceeds.coin_credit;

        // if order is not crossed, creator is maker, and only needs to approve tokens.

        if deposit_amount > 0 {
            //if !crossed {
            msg!("approval amount {}", deposit_amount);
            //msg!("deposit vault {}", deposit_vault);
            //msg!("approval vault {}", payer);

            let transfer_ix = Approve {
                to: payer.to_account_info(),
                delegate: market.to_account_info(),
                authority: authority.to_account_info(), // authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(token_program.to_account_info(), transfer_ix);
            //let marginal_deposit = cpi_ctx * 2 / 100
            anchor_spl::token::approve(cpi_ctx, deposit_amount).map_err(|err| match err {
                _ => error!(ErrorCode::TransferFailed),
            })?;
            msg!("tokens approved for later spending.");
        }
        
        
        msg!("matched amount {}", matched_amount_coin);
       


           Ok(())
       }


       
    pub fn finalise_matches_bid(
                ctx: Context<NewMatch>,
                event1_slot: u8,
                event2_slot: u8,
            ) -> Result<()> {
                let program_id = ctx.program_id;
                let open_orders_auth = &mut ctx.accounts.open_orders_owner;
                let open_orders_cpty = &mut ctx.accounts.open_orders_counterparty;
                let market = &ctx.accounts.market;
                let pc_vault = &ctx.accounts.pc_vault;
                let req_q = &mut ctx.accounts.req_q;
                let event_q = &mut ctx.accounts.event_q.load_mut()?;
                let authority = &ctx.accounts.authority;
                let token_program = &ctx.accounts.token_program;
                let coin_mint = &ctx.accounts.coin_mint;
                let pc_mint = &ctx.accounts.pc_mint;
                let payerpc = &ctx.accounts.pcpayer;
            
                let event1: Event = event_q.buf[usize::from(event1_slot)];
                let event2: Event = event_q.buf[usize::from(event2_slot)];
            
                let event1_orderid = event1.order_id;
                let event2_orderid = event2.order_id;
                let event1_orderidsecond = event1.order_id_second;
                let event2_orderidsecond = event2.order_id_second;
            
                msg!("event1 orderid is {}", event1_orderid);
                msg!("event1 orderidsecond is {}", event1_orderidsecond);
                msg!("event2 orderid is {}", event2_orderid);
                msg!("event2 orderidsecond is {}", event2_orderidsecond);
            
                require!(event1.order_id_second == event2.order_id, Error);
            
                let events: Vec<Event> = vec![event1, event2];
                let mut order_id_general: u128 = 0;
                let mut first_event_done: bool = false;
                let mut eventBidFinalised: bool = false;
                let mut eventAskFinalised: bool = false;
            
                
                for (index, parsed_event) in events.iter().enumerate() {
                   
                    let sider; // u8 for side
                    match BitFlags::<EventFlag>::from_bits(parsed_event.event_flags) {
                        Ok(flags) => {
                            let side = EventFlag::flags_to_side(flags);
                            msg!("The side derived from parsed_event.event_flags is: {:?}", side);
                        },
                        Err(_) => {
                            msg!("Error: Invalid flags detected: {:?}", parsed_event.event_flags);
                        }
                    }
                    
                    
                    let flags = BitFlags::<EventFlag>::from_bits(parsed_event.event_flags).unwrap_or(BitFlags::empty());

                    let side = EventFlag::flags_to_side(flags);
                    if side == Side::Bid {
                        sider = 1;
                    }
                    else {
                        sider = 2;
                    }
                    msg!("side is {}", sider);
                //match side {
                  //  Side::Bid => {
                //let sider = 1;
                
                    if sider == 1 {
                        let mut qty_pc = parsed_event.native_qty_paid;
                        let mut qty_coin = parsed_event.native_qty_released;
                        let mut available_funds = open_orders_auth.native_pc_free;
                        msg!("the available funds is {}", available_funds);
                        msg!("the required funds are {}", qty_pc);
            
                        //let mut deposit_amount = qty_pc / 1000;
                        let mut deposit_amount = qty_pc / (1000* market.pc_lot_size) ;
                        msg!("Deposit amt {}", deposit_amount);
                        let mut cpty_deposit_amt = qty_coin;
                        let mut deposit_vault = pc_vault;
            
                        if deposit_amount > 0 {
                            // Derive the market's PDA and bump seed.
                            let (market_pda, bump_seed) = Pubkey::find_program_address(
                                &[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref()],
                                &program_id
                            );

                           
                            let market_seed = b"market";
                            
                            let coin_mint_key = coin_mint.key();
                            let pc_mint_key = pc_mint.key();

                            let coin_mint_seed = coin_mint_key.as_ref();
                            let pc_mint_seed = pc_mint_key.as_ref();

                            let bump_seed_arr: &[u8] = &[bump_seed];

                            let seed_slices: [&[u8]; 4] = [market_seed, coin_mint_seed, pc_mint_seed, bump_seed_arr];
                            let seeds: &[&[&[u8]]] = &[&seed_slices];
                           
                            let transfer_ix = Transfer {
                                from: payerpc.to_account_info(),
                                to: deposit_vault.to_account_info(),
                                authority: market.to_account_info(),  // Using the market PDA as the authority.
                            };
                        
                            // Construct the context with the market PDA and bump seed.
                            let cpi_ctx = CpiContext::new_with_signer(
                                token_program.to_account_info(),
                                transfer_ix,
                                seeds,
                                //&[&[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref(), &[seeds]]]
                            );
                        
                            anchor_spl::token::transfer(cpi_ctx, deposit_amount).map_err(|err| match err {
                                _ => error!(ErrorCode::TransferFailed),
                            })?;
                            let fin: u8 = 1;
                            let owner = parsed_event.owner;
                            open_orders_auth.credit_unlocked_pc(deposit_amount);
                            let bidder_fill = Event::new(EventView::Finalise {
                             side: Side::Ask,
                             maker: true,
                             native_qty_paid:  parsed_event.native_qty_paid,
                             native_qty_received: parsed_event.native_qty_released,
                             order_id: parsed_event.order_id,
                             owner: parsed_event.owner,
                             owner_slot: parsed_event.owner_slot,
                             finalised: fin,
                             cpty: owner,
                         });
                         //let idx = event_q.as_mut().unwrap().head + 1;
                         let mut event_slot = 1;
                         if index == 0 {
                            event_slot = event1_slot;
                         }
                         if index == 1 {
                            event_slot = event2_slot;
                         }
                         let idx = event_slot;
                         event_q.buf[idx as usize] = bidder_fill;
                         eventBidFinalised = true;
                        }
                        if cpty_deposit_amt > 0 {
                           //open_orders_cpty.credit_unlocked_coin(cpty_deposit_amt);
                        }
                        let mut remaining_funds = 0;
                        if remaining_funds > 0 {
                           
                            msg!("Newly locked PC for bidder {}", qty_pc);
                        }
                        if index == 0 {
                            open_orders_auth.native_pc_free  = open_orders_auth
                                .native_pc_free
                                .checked_add(qty_pc)
                                .unwrap();
                            // open_orders_auth.credit_unlocked_pc(deposit_amount);
                            }
                        if index == 1 {
                            open_orders_cpty.native_pc_free  = open_orders_cpty
                                .native_pc_free
                                .checked_add(deposit_amount)
                                .unwrap();
                            }
                    }
                    // Side::Ask => {
                    if sider == 2 {
                        let mut eventFin = parsed_event.finalised;
                        //let eventAskFinalised;
                        if eventFin == 1{
                            eventAskFinalised = true;
                        }
                        if eventFin == 0 {
                            eventAskFinalised == false;
                        }
                        
                    } 
                }
                //Settlement if both events are finalised
                
                if eventBidFinalised == true && eventAskFinalised == true {
                    //checked subtract pc from event1 owner
                   // open_orders_auth.native_pc_free -= event1.native_qty_paid;
                    open_orders_auth.native_pc_free = open_orders_auth
                                .native_pc_free
                                .checked_sub(event1.native_qty_paid)
                                .unwrap();
                            
                    //subtract coin from event2 owner
                    //open_orders_cpty.native_coin_free -= event2.native_qty_paid;
                    //checked sub
                    open_orders_cpty.native_coin_free = open_orders_cpty
                                .native_coin_free
                                .checked_sub(event2.native_qty_paid)
                                .unwrap();
                            
                    //add pc to event2 owner
                    open_orders_cpty.native_pc_free += event2.native_qty_released;
                    //add coin to event1 owner  
                    open_orders_auth.native_coin_free += event1.native_qty_released;

                    msg!("settlement completed!");

                }
            
                Ok(())
            }


            
        
            
            
            
            

            /// just in time transfers for ask side
pub fn finalise_matches_ask(
                ctx: Context<NewMatchAsk>,
                event1_slot: u8,
                event2_slot: u8,
            ) -> Result<()> {
                let program_id = ctx.program_id;
                let open_orders_auth = &mut ctx.accounts.open_orders_owner; //owner of event 1
                let open_orders_cpty = &mut ctx.accounts.open_orders_counterparty; // owner of event 2
                let market = &ctx.accounts.market;
                let coin_vault = &ctx.accounts.coin_vault;
                let req_q = &mut ctx.accounts.req_q;
                let event_q = &mut ctx.accounts.event_q.load_mut()?;
                let authority = &ctx.accounts.authority;
                let token_program = &ctx.accounts.token_program;
                let coin_mint = &ctx.accounts.coin_mint;
                let pc_mint = &ctx.accounts.pc_mint;
                let payercoin = &ctx.accounts.coinpayer;
            
                let event1: Event = event_q.buf[usize::from(event1_slot)];
                let event2: Event = event_q.buf[usize::from(event2_slot)];
            
                let event1_orderid = event1.order_id;
                let event2_orderid = event2.order_id;
                let event1_orderidsecond = event1.order_id_second;
                let event2_orderidsecond = event2.order_id_second;
            
                msg!("event1 orderid is {}", event1_orderid);
                msg!("event1 orderidsecond is {}", event1_orderidsecond);
                msg!("event2 orderid is {}", event2_orderid);
                msg!("event2 orderidsecond is {}", event2_orderidsecond);
            
                //require!(event1.order_id_second == event2.order_id, Error);
            
                let events: Vec<Event> = vec![event1, event2];
                let mut order_id_general: u128 = 0;
                let mut first_event_done: bool = false;
                let mut eventBidFinalised: bool = false;
                let mut eventAskFinalised: bool = false;
            
                //let parsed_event = events[1];
                //let mut sider = parsed_event.event_flags;
                for (index, parsed_event) in events.iter().enumerate() {
                    let sider;
                   
                    //let side = flags_to_side(parsed_event.event_flags);
                    let flags = BitFlags::<EventFlag>::from_bits(parsed_event.event_flags).unwrap_or(BitFlags::empty());

                    let side = EventFlag::flags_to_side(flags);
                    if side == Side::Bid {
                        sider = 1;
                    }
                    else {
                        sider = 2;
                    }
                    msg!("side is {}", sider);
                    //match side {
                        //Side::Ask => {
                       if sider == 2  {
                            //let mut qty_pc = parsed_event.native_qty_paid;
                            let mut qty_coin = parsed_event.native_qty_paid;
                            let mut available_funds = open_orders_auth.native_coin_free;
                            msg!("the available funds is {}", available_funds);
                            msg!("the required funds are {}", qty_coin);
                
                            //let mut deposit_amount = qty_pc / 1000;
                            let mut deposit_amount = qty_coin; //decimals already multiplied
                            msg!("Deposit amt {}", deposit_amount);
                            let mut cpty_deposit_amt = qty_coin;
                            let mut deposit_vault = coin_vault;
                
                            if deposit_amount > 0 {
                                // Derive the market's PDA and bump seed.
                                let (market_pda, bump_seed) = Pubkey::find_program_address(
                                    &[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref()],
                                    &program_id
                                );

                            
                                let market_seed = b"market";
                                
                                let coin_mint_key = coin_mint.key();
                                let pc_mint_key = pc_mint.key();

                                let coin_mint_seed = coin_mint_key.as_ref();
                                let pc_mint_seed = pc_mint_key.as_ref();

                                let bump_seed_arr: &[u8] = &[bump_seed];

                                let seed_slices: [&[u8]; 4] = [market_seed, coin_mint_seed, pc_mint_seed, bump_seed_arr];
                                let seeds: &[&[&[u8]]] = &[&seed_slices];
                                
                                let transfer_ix = Transfer {
                                    from: payercoin.to_account_info(),
                                    to: deposit_vault.to_account_info(),
                                    authority: market.to_account_info(),  // Using the market PDA as the authority.
                                };
                            
                                // Construct the context with the market PDA and bump seed.
                                let cpi_ctx = CpiContext::new_with_signer(
                                    token_program.to_account_info(),
                                    transfer_ix,
                                    seeds,
                                    //&[&[b"market", coin_mint.key().as_ref(), pc_mint.key().as_ref(), &[seeds]]]
                                );
                            
                                anchor_spl::token::transfer(cpi_ctx, deposit_amount).map_err(|err| match err {
                                    _ => error!(ErrorCode::TransferFailed),
                                })?;
                                let fin: u8 = 1;
                                let owner = parsed_event.owner;
                                let asker_fill = Event::new(EventView::Finalise {
                                    side: Side::Ask,
                                    maker: true,
                                    native_qty_paid:  parsed_event.native_qty_paid,
                                    native_qty_received: parsed_event.native_qty_released,
                                    order_id: parsed_event.order_id,
                                    owner: parsed_event.owner,
                                    owner_slot: parsed_event.owner_slot,
                                    finalised: fin,
                                    cpty: owner,
                                });
                                //let idx = event_q.as_mut().unwrap().head + 1;
                                let mut event_slot = 0;
                                if index == 0 {
                                   event_slot = event1_slot;
                                }
                                if index == 1 {
                                   event_slot = event2_slot;
                                }
                                let idx = event_slot;
                                event_q.buf[idx as usize] = asker_fill;
                                let event_bid_finalised = true;
                            
                            //accounting
                            if index == 0 {
                            open_orders_auth.native_coin_free = open_orders_auth
                                .native_coin_free
                                .checked_add(deposit_amount)
                                .unwrap();
                            }
                            if index == 1 {
                                open_orders_cpty.native_coin_free = open_orders_cpty
                                    .native_coin_free
                                    .checked_add(deposit_amount)
                                    .unwrap();

                        }


                        /*
                        if cpty_deposit_amt > 0 {
                            open_orders_cpty.credit_unlocked_coin(cpty_deposit_amt);
                        } */
                        let mut remaining_funds = 1;
                        eventAskFinalised = true;
                        
                    }
                    //Side::Bid => {
                        if sider == 1 {
                            // check if event is finalised
                            let mut eventFin = parsed_event.finalised;
                            //let eventBidFinalised;
                            if eventFin == 1{
                                eventBidFinalised = true;
                            }
                            if eventFin == 0 {
                                eventBidFinalised == false;
                            }

                      
                    }
                //}
                }
            }
            //Settle funds
            if eventBidFinalised == true && eventAskFinalised == true {
                //checked subtract pc from event1 owner
                //open_orders_auth.native_pc_free -= event1.native_qty_paid;
                open_orders_auth.native_pc_free = open_orders_auth
                                .native_pc_free
                                .checked_sub(event1.native_qty_paid)
                                .unwrap();
                            
                //subtract coin from event2 owner
                //open_orders_cpty.native_coin_free -= event2.native_qty_paid;
                open_orders_cpty.native_coin_free = open_orders_cpty
                                .native_coin_free
                                .checked_sub(event2.native_qty_paid)
                                .unwrap();
                //add pc to event2 owner
                open_orders_cpty.native_pc_free += event2.native_qty_released;
                //add coin to event1 owner
                open_orders_auth.native_coin_free += event1.native_qty_released;
            
            }
                Ok(())
            
        }

            
         }



#[account]
#[derive(Default)]
pub struct Market {
    coin_vault: Pubkey,
    pc_vault: Pubkey,

    coin_mint: Pubkey,
    pc_mint: Pubkey,

    coin_lot_size: u64,
    pc_lot_size: u64,

    coin_deposits_total: u64,
    pc_deposits_total: u64,

    bids: Pubkey,
    asks: Pubkey,

    req_q: Pubkey,
    event_q: Pubkey,

    authority: Pubkey,
}

impl Market {
    pub const MAX_SIZE: usize = 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 32 + 32 + 32 + 32 + 32;

    #[inline]
    fn check_payer_mint(&self, payer_mint: Pubkey, side: Side) -> bool {
        match side {
            Side::Bid => {
                if payer_mint == self.pc_mint {
                    return true;
                }
                return false;
            }
            Side::Ask => {
                if payer_mint == self.coin_mint {
                    return true;
                }
                return false;
            }
        }
    }
}

#[bitflags]
#[repr(u8)]
#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize)]
enum RequestFlag {
    NewOrder = 0x01,
    CancelOrder = 0x02,
    Bid = 0x04,
    PostOnly = 0x08,
    ImmediateOrCancel = 0x10,
    DecrementTakeOnSelfTrade = 0x20,
}

pub enum RequestView {
    NewOrder {
        side: Side,
        order_type: OrderType,
        order_id: u128,
        max_coin_qty: u64,
        native_pc_qty_locked: Option<u64>,
        owner_slot: u8,
        owner: Pubkey,
    },
    CancelOrder {
        side: Side,
        order_id: u128,
        cancel_id: u64,
        expected_owner_slot: u8,
        expected_owner: Pubkey,
    },

}

#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct JitStruct {
        side: Side,
        maker: bool,
        native_qty_paid: u64,
        native_qty_received: u64,
        order_id: u128,
        owner: Pubkey,
        owner_slot: u8,
    }
// #[repr(packed)]
#[derive(Copy, Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub struct RequestQueueHeader {
    next_seq_num: u64,
}

impl RequestQueueHeader {
    pub const MAX_SIZE: usize = 8;
}

#[account]
#[derive(Default)]
pub struct RequestQueue {
    header: RequestQueueHeader,
}

impl RequestQueue {
    pub const MAX_SIZE: usize = RequestQueueHeader::MAX_SIZE;

    fn gen_order_id(&mut self, limit_price: u64, side: Side) -> u128 {
        let seq_num = self.gen_seq_num();
        let upper = (limit_price as u128) << 64;
        let lower = match side {
            Side::Bid => !seq_num,
            Side::Ask => seq_num,
        };
        upper | (lower as u128)
    }

    fn gen_seq_num(&mut self) -> u64 {
        let seq_num = self.header.next_seq_num;
        self.header.next_seq_num += 1;
        seq_num
    }
}

#[bitflags]
#[repr(u8)]
#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize)]
enum EventFlag {
    Fill = 0x1,
    Out = 0x2,
    Bid = 0x4,
    Maker = 0x8,
    ReleaseFunds = 0x10,
    Finalise = 0x20,
}

impl EventFlag {
    #[inline]
    fn from_side(side: Side) -> BitFlags<Self> {
        match side {
            Side::Bid => EventFlag::Bid.into(),
            Side::Ask => BitFlags::empty(),
        }
    }

    #[inline]
    fn flags_to_side(flags: BitFlags<Self>) -> Side {
        if flags.contains(EventFlag::Bid) {
            Side::Bid
        } else {
            Side::Ask
        }
    }
}

pub enum EventView {
    Fill {
        side: Side,
        maker: bool,
        native_qty_paid: u64,
        native_qty_received: u64,
        order_id: u128,
        owner: Pubkey,
        owner_slot: u8,
        finalised: u8,
        cpty: Pubkey,
        order_id_second: u128,
    },
    Out {
        side: Side,
        release_funds: bool,
        native_qty_unlocked: u64,
        native_qty_still_locked: u64,
        order_id: u128,
        owner: Pubkey,
        owner_slot: u8,
        finalised: u8,
    },
    Finalise {
        side: Side,
        maker: bool,
        native_qty_paid: u64,
        native_qty_received: u64,
        order_id: u128,
        owner: Pubkey,
        owner_slot: u8,
        finalised: u8,
        cpty: Pubkey,
    },
}

impl EventView {
    fn side(&self) -> Side {
        match self {
            &EventView::Fill { side, .. } | &EventView::Out { side, .. } |  &EventView::Finalise { side, .. } => side,
        }
    }
}

#[repr(packed)]
//#[derive(Copy, Clone, Default, AnchorSerialize, AnchorDeserialize)]
#[zero_copy]
pub struct Event {
    event_flags: u8,
    owner_slot: u8,

    native_qty_released: u64,
    native_qty_paid: u64,

    order_id: u128,
    owner: Pubkey,
    finalised: u8,
    order_id_second: u128,
    //cpty: Pubkey,
}



impl Event {
    pub const MAX_SIZE: usize = 1 + 1 + 8 + 8 + 16 + 32 + 1 + 32;

    #[inline(always)]
    pub fn new(view: EventView) -> Self {
        match view {
            EventView::Fill {
                side,
                maker,
                native_qty_paid,
                native_qty_received,
                order_id,
                owner,
                owner_slot,
                finalised,
                cpty,
                order_id_second,
            } => {
                let mut flags = EventFlag::from_side(side) | EventFlag::Fill;
                if maker {
                    flags |= EventFlag::Maker;
                }
                let mut finalised: u8 = 0;
                Event {
                    event_flags: flags.bits(),
                    owner_slot,
                    native_qty_released: native_qty_received,
                    native_qty_paid,
                    order_id,
                    owner,
                    finalised,
                    order_id_second,
                    //cpty,
                }
            },

            EventView::Out {
                side,
                release_funds,
                native_qty_unlocked,
                native_qty_still_locked,
                order_id,
                owner,
                owner_slot,
                finalised,
            } => {
                let mut flags = EventFlag::from_side(side) | EventFlag::Out;
                if release_funds {
                    flags |= EventFlag::ReleaseFunds;
                }
                let mut finalised: u8 = 0;
                let mut cpty: Pubkey = owner;
                Event {
                    event_flags: flags.bits(),
                    owner_slot,
                    //finalised: finalised,
                    native_qty_released: native_qty_unlocked,
                    native_qty_paid: native_qty_still_locked,
                    order_id,
                    owner,
                    finalised,
                    order_id_second: 0,
                    //cpty
                }

            },

            EventView::Finalise {
                side,
                maker,
                native_qty_paid,
                native_qty_received,
                order_id,
                owner,
                owner_slot,
                finalised,
                cpty,
            } => {
                let mut flags = EventFlag::from_side(side) | EventFlag::Fill;
                if maker {
                    flags |= EventFlag::Maker;
                }
                //let mut finalsed= true;
                Event {
                    event_flags: flags.bits(),
                    owner_slot,
                    //finalised: finalised,
                    native_qty_released: native_qty_received,
                    native_qty_paid,
                    order_id,
                    owner,
                    finalised,
                    order_id_second:0,
                    //cpty,
                }
        }
    }
}

    
}

#[repr(packed)]
#[zero_copy]
//#[derive(Copy, Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub struct EventQueueHeader {
    head: u64,
    count: u64,
    seq_num: u64,
}

impl EventQueueHeader {
    pub const MAX_SIZE: usize = 8 + 8 + 8;

    fn head(&self) -> u64 {
        self.head
    }
    fn set_head(&mut self, value: u64) {
        self.head = value;
    }
    fn count(&self) -> u64 {
        self.count
    }
    fn set_count(&mut self, value: u64) {
        self.count = value;
    }
    fn incr_event_id(&mut self) {
        self.seq_num += 1;
    }
    fn decr_event_id(&mut self, n: u64) {
        self.seq_num -= n;
    }
}

//#[account]
//#[derive(Default)]
#[account(zero_copy)]
#[repr(packed)]
pub struct EventQueue {
    header: EventQueueHeader,
    head: u64,
    buf: [Event; 100], // Used zero_copy to expand eventsQ size
}


impl EventQueue {
    pub const MAX_SIZE: usize = EventQueueHeader::MAX_SIZE + 20 * Event::MAX_SIZE;

    #[inline]
    pub fn len(&self) -> u64 {
        return self.head;
    } 
       

    #[inline]
    pub fn full(&self) -> bool {
        self.header.count() as usize == self.buf.len()
    }

    #[inline]
    pub fn empty(&self) -> bool {
        self.header.count() == 0
    }

    #[inline]
    pub fn push_back(&mut self, value: Event) -> Result<()> {
        if self.full() {
            let _ = self.pop_front();
        }

        //let slot = Some(peek_front_mut());
        let _ = self.pop_front();

        let slot = ((self.header.head() + self.header.count()) as usize) % self.buf.len();
        self.buf[slot] = value;

        let count = self.header.count();
        //self.header.set_count(count + 1);

        //self.header.incr_event_id();

        Ok(())
    }

    #[inline]
    pub fn peek_front(&self) -> Option<&Event> {
        if self.empty() {
            return None;
        }
        Some(&self.buf[self.header.head() as usize])
    }

    #[inline]
    pub fn peek_front_mut(&mut self) -> Option<&mut Event> {
        if self.empty() {
            return None;
        }
        Some(&mut self.buf[self.header.head() as usize])
    }

    #[inline]
    pub fn pop_front(&mut self) -> Result<Event> {
        require!(!self.empty(), ErrorCode::EmptyQueue);

        let value = self.buf[self.header.head() as usize];

        let count = self.header.count();
        self.header.set_count(count - 1);

        let head = self.header.head();
        self.header.set_head((head + 1) % self.buf.len() as u64);

        Ok(value)
    }


   
    }



struct EventQueueIterator<'a> {
    queue: &'a EventQueue,
    index: u64,
}



// User owner value to track cpty
#[derive(Copy, Clone, Default, AnchorSerialize, AnchorDeserialize)]
pub struct Order {
    order_id: u128,
    qty: u64,
    owner: Pubkey,
    owner_slot: u8,
}

impl Order {
    pub const MAX_SIZE: usize = 16;

    pub fn price_from_order_id(order_id: u128) -> u64 {
        (order_id >> 64) as u64
    }

    pub fn price(&self) -> u64 {
        Order::price_from_order_id(self.order_id)
    }
}

#[account]
#[derive(Default)]
pub struct Orders<const T: bool> {
    sorted: Vec<Order>,
}

impl<const T: bool> Orders<T> {
    pub const MAX_SIZE: usize = 8 + 4 + 32 * Order::MAX_SIZE;

    pub fn find_bbo(&self) -> Result<&Order> {
        require!(self.sorted.len() > 0, ErrorCode::EmptyOrders);
        Ok(&self.sorted[0])
    }

    pub fn find_bbo_mut(&mut self) -> Result<&mut Order> {
        require!(self.sorted.len() > 0, ErrorCode::EmptyOrders);
        Ok(&mut self.sorted[0])
    }

    pub fn insert(&mut self, order: Order) -> Result<()> {
        self.sorted.push(order.clone());
        let mut is_found = false;
        for i in 0..(self.sorted.len() - 1) {
            if T {
                if self.sorted[i].price() < order.price() {
                    self.sorted[i] = order;
                    is_found = true;
                }
            } else {
                if self.sorted[i].price() > order.price() {
                    self.sorted[i] = order;
                    is_found = true;
                }
            }
            if is_found {
                self.sorted[i + 1] = self.sorted[i];
            }
        }

        Ok(())
    }

    pub fn delete(&mut self, order_id: u128) -> Result<()> {
        let mut is_found = false;
        for i in 0..(self.sorted.len() - 1) {
            if self.sorted[i].order_id == order_id {
                is_found = true;
            }
            if is_found {
                self.sorted[i] = self.sorted[i + 1];
            }
        }
        self.sorted.pop();

        Ok(())
    }

    pub fn delete_worst(&mut self) -> Result<Order> {
        require!(!self.sorted.is_empty(), ErrorCode::EmptyOrders);
        Ok(self.sorted.pop().unwrap())
    }
}

pub type Bids = Orders<true>;
pub type Asks = Orders<false>;

pub struct RequestProceeds {
    pub coin_unlocked: u64,
    pub native_pc_unlocked: u64,

    pub coin_credit: u64,
    pub native_pc_credit: u64,

    pub coin_debit: u64,
    pub native_pc_debit: u64,
    pub jit_data: Vec<JitStruct>,
}

macro_rules! impl_incr_method {
    ($method:ident, $var:ident) => {
        #[allow(unused)]
        pub fn $method(&mut self, $var: u64) {
            self.$var = self.$var.checked_add($var).unwrap();
        }
    };
}

impl RequestProceeds {
    impl_incr_method!(unlock_coin, coin_unlocked);
    impl_incr_method!(unlock_native_pc, native_pc_unlocked);
    impl_incr_method!(credit_coin, coin_credit);
    impl_incr_method!(credit_native_pc, native_pc_credit);
    impl_incr_method!(debit_coin, coin_debit);
    impl_incr_method!(debit_native_pc, native_pc_debit);
}

pub struct OrderBook<'a> {
    bids: &'a mut Bids,
    asks: &'a mut Asks,
    market: &'a Market,
}

impl<'a> OrderBook<'a> {
    pub fn find_bbo(&self, side: Side) -> Result<&Order> {
        match side {
            Side::Bid => self.bids.find_bbo(),
            Side::Ask => self.asks.find_bbo(),
        }
    }

    pub fn find_bbo_mut(&mut self, side: Side) -> Result<&mut Order> {
        match side {
            Side::Bid => self.bids.find_bbo_mut(),
            Side::Ask => self.asks.find_bbo_mut(),
        }
    }

    pub fn process_request(
        &mut self,
        request: &RequestView,
        event_q: &mut EventQueue,
        proceeds: &mut RequestProceeds,
    ) -> Result<Option<RequestView>> {
        Ok(match *request {
            RequestView::NewOrder {
                side,
                order_type,
                order_id,
                max_coin_qty,
                native_pc_qty_locked,
                owner_slot,
                owner,
            } => self
                .new_order(
                    NewOrderParams {
                        side,
                        order_type,
                        order_id,
                        max_coin_qty,
                        native_pc_qty_locked,
                        owner_slot,
                        owner,
                    },
                    event_q,
                    proceeds,
                )?
                .map(|remaining| RequestView::NewOrder {
                    side,
                    order_type,
                    order_id,
                    max_coin_qty: remaining.coin_qty_remaining,
                    native_pc_qty_locked: remaining.native_pc_qty_remaining,
                    owner_slot,
                    owner,
                }),
            RequestView::CancelOrder {
                side,
                order_id,
                cancel_id: _,
                expected_owner,
                expected_owner_slot,
            } => {
                self.cancel_order(
                    CancelOrderParams {
                        side,
                        order_id,
                        expected_owner,
                        expected_owner_slot,
                    },
                    event_q,
                )?;
                None
            }
            /*


            RequestView::JitStruct { .. } => {
                msg!("jit it!");
                None
            }
            */
        })
    }
}

pub struct NewOrderParams {
    side: Side,
    order_type: OrderType,
    order_id: u128,
    max_coin_qty: u64,
    native_pc_qty_locked: Option<u64>,
    owner: Pubkey,
    owner_slot: u8,
}

struct OrderRemaining {
    coin_qty_remaining: u64,
    native_pc_qty_remaining: Option<u64>,
}

impl<'a> OrderBook<'a> {
    fn new_order(
        &mut self,
        params: NewOrderParams,
        event_q: &mut EventQueue,
        proceeds: &mut RequestProceeds,
    ) -> Result<Option<OrderRemaining>> {
        let NewOrderParams {
            side,
            order_type,
            order_id,
            owner,
            owner_slot,
            mut max_coin_qty,
            mut native_pc_qty_locked,
        } = params;
        let (mut post_only, mut post_allowed) = match order_type {
            OrderType::Limit => (false, true),
            OrderType::ImmediateOrCancel => (false, false),
            OrderType::PostOnly => (true, true),
        };
        //check Order impls for sourcing payer acc.
        let limit_price = Order::price_from_order_id(order_id);
        let mut limit = 10;
        loop {
            if limit == 0 {
                // Stop matching and release funds if we're out of cycles
                post_only = true;
                post_allowed = true;
            }

            let remaining_order = match side {
                Side::Bid => {
                //let deposit_vault = pc_vault;
                self.new_bid(
                    NewBidParams {
                        max_coin_qty,
                        native_pc_qty_locked: native_pc_qty_locked.unwrap(),
                        limit_price: Some(limit_price),
                        order_id,
                        owner,
                        owner_slot,
                        post_only,
                        post_allowed,
                    },
                    event_q,
                    proceeds,
                )},
                Side::Ask => {
                    
                    self.new_ask(
                        NewAskParams {
                            max_qty: max_coin_qty,
                            limit_price,
                            order_id,
                            owner,
                            owner_slot,
                            post_only,
                            post_allowed,
                        },
                        event_q,
                        proceeds,
                    )
                }
            }?;
            if limit == 0 {
                return Ok(remaining_order);
            }
            limit -= 1;
            match remaining_order {
                Some(remaining_order) => {
                    max_coin_qty = remaining_order.coin_qty_remaining;
                    native_pc_qty_locked = remaining_order.native_pc_qty_remaining;
                }
                None => return Ok(None),
                
            };
        }
    }
}

struct NewBidParams {
    max_coin_qty: u64,
    native_pc_qty_locked: u64,
    limit_price: Option<u64>,
    order_id: u128,
    owner: Pubkey,
    owner_slot: u8,
    post_only: bool,
    post_allowed: bool,
}

impl<'a> OrderBook<'a> {
    fn new_bid(
        &mut self,
        params: NewBidParams,
        event_q: &mut EventQueue,
        to_release: &mut RequestProceeds,
    ) -> Result<Option<OrderRemaining>> {
        let NewBidParams {
            max_coin_qty,
            native_pc_qty_locked,
            limit_price,
            order_id,
            owner,
            owner_slot,
            post_only,
            post_allowed,
        } = params;
        if post_allowed {
            require!(limit_price.is_some(), ErrorCode::InvalidPrice);
        }

        let coin_lot_size = self.market.coin_lot_size;
        let pc_lot_size = self.market.pc_lot_size;

        msg!("[OrderBook.new_bid] coin_lot_size: {}", coin_lot_size);
        msg!("[OrderBook.new_bid] pc_lot_size: {}", pc_lot_size);

        let max_pc_qty = native_pc_qty_locked / pc_lot_size;

        msg!("[OrderBook.new_bid] max_coin_qty: {}", max_coin_qty);
        msg!("[OrderBook.new_bid] native_pc_qty_locked: {}", native_pc_qty_locked);
        msg!("[OrderBook.new_bid] limit_price: {}", limit_price.unwrap());
        msg!("[OrderBook.new_bid] order_id: {}", order_id);
        msg!("[OrderBook.new_bid] post_only: {}", post_only);
        msg!("[OrderBook.new_bid] post_allowed: {}", post_allowed);

        let mut coin_qty_remaining = max_coin_qty;
        let mut pc_qty_remaining = max_pc_qty;
        let mut jit_data = vec![];
        
        msg!("bid inserted");
        let insert_result = self.bids.insert(Order {
            order_id,
            qty: max_coin_qty,
            owner,
            owner_slot,
        });
        if let Err(err) = insert_result {
            if err == error!(ErrorCode::OrdersAlreadyFull) {
                // boot out the least aggressive bid
                msg!("bids full! booting...");
                let order = self.bids.delete_worst()?;
                let out = Event::new(EventView::Out {
                    side: Side::Bid,
                    release_funds: true,
                    native_qty_unlocked: order.qty * order.price() * pc_lot_size,
                    native_qty_still_locked: 0,
                    order_id: order.order_id,
                    owner: order.owner,
                    owner_slot: order.owner_slot,
                    finalised: 0,
                });
                let idx = event_q.head + 1;
                msg!("event id is {}", idx);

                event_q.buf[idx as usize] = out;
                event_q.head +=1;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Bid");
                msg!("event.release_funds: {}", "true");
                msg!("event.native_qty_unlocked: {}", order.qty * order.price() * pc_lot_size);
                msg!("event.order_id: {}", order.order_id);
                msg!("event.order_id_second: {}", 0);
                msg!("event.order: {}", order.owner);
                msg!("event.owner_slot: {}", order.owner_slot);
                msg!("event.finalised: {}", "0");
/*
                event_q
                    .push_back(out)
                    .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?; */
                self.bids.insert(Order {
                    order_id,
                    qty: max_coin_qty,
                    owner,
                    owner_slot,
                })?;
            }
}
        let crossed;
        let done = loop {
            let best_offer = match self.find_bbo_mut(Side::Ask) {
                Err(_) => {
                    crossed = false;
                    break true;
                }
                Ok(o) => o,
            };

            let trade_price = best_offer.price();
            crossed = limit_price
                .map(|limit_price| limit_price >= trade_price)
                .unwrap_or(true);
            // testing

            if !crossed || post_only {
                msg!("not crossed!");
                break true;
            }
            msg!("crossed!");
            let offer_size = best_offer.qty;
            let trade_qty = offer_size
                .min(coin_qty_remaining)
                .min(pc_qty_remaining / trade_price);

            if trade_qty == 0 {
                break true;
            }

            let native_maker_pc_qty = trade_qty * trade_price * pc_lot_size;
            
            let idx = event_q.head + 1;
            let maker_fill = Event::new(EventView::Fill {
                side: Side::Ask,
                maker: true,
                native_qty_paid: trade_qty * coin_lot_size,
                native_qty_received: native_maker_pc_qty,
                order_id: best_offer.order_id,
                owner: best_offer.owner,
                owner_slot: best_offer.owner_slot,
                finalised: 0,
                cpty: owner,
                order_id_second: order_id,
            });
            //let lenevents = event_q.len();
            //let idx = lenevents +1;
            
            //write maker side event to eventQ
            event_q.buf[idx as usize] = maker_fill;
            event_q.head +=1;
             //   .push_back(maker_fill)
             //   .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Ask");
                msg!("event.maker: {}", "true");
                msg!("event.native_qty_paid: {}", trade_qty * coin_lot_size);
                msg!("event.native_qty_received: {}", native_maker_pc_qty);
                msg!("event.order_id: {}", best_offer.order_id);
                msg!("event.order_id_second: {}", order_id);
                msg!("event.owner: {}", best_offer.owner);
                msg!("owner_slot: {}", best_offer.owner_slot);
                msg!("event.finalised: {}", "0");
                msg!("event.cpty_orderid: {}", order_id);



            best_offer.qty -= trade_qty;
            coin_qty_remaining -= trade_qty;
            pc_qty_remaining -= trade_qty * trade_price;

            //if order is filled, delete (ask) order.
            if best_offer.qty == 0 {
                let best_offer_id = best_offer.order_id;

                let event_out = Event::new(EventView::Out {
                    side: Side::Ask,
                    release_funds: true,
                    native_qty_unlocked: 0,
                    native_qty_still_locked: 0,
                    order_id: best_offer_id,
                    owner: best_offer.owner,
                    owner_slot: best_offer.owner_slot,
                    finalised: 0,
                });
                let idx = event_q.head + 1;
                msg!("event id is {}", idx);
                event_q.buf[idx as usize] = event_out;
                event_q.head +=1;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Ask");
                msg!("event.release_funds: {}", "true");
                msg!("event.native_qty_unlocked: {}", "0");
                msg!("event.native_qty_still_locked: {}", "0");
                msg!("event.order_id: {}", best_offer_id);
                msg!("event.order_id_second: {}", 0);
                msg!("event.owner: {}", best_offer.owner);
                msg!("event.owner_slot: {}", best_offer.owner_slot);
                msg!("event.finalised: {}", "0");



            }

            break false;
        };

        msg!("[OrderBook.new_bid] crossed: {}", crossed);
        msg!("[OrderBook.new_bid] done: {}", done);
        msg!("[OrderBook.new_bid] countrerparty: {}", done);
        msg!("[OrderBook.new_bid] coin_qty_remaining: {}", coin_qty_remaining);
        msg!("[OrderBook.new_bid] pc_qty_remaining: {}", pc_qty_remaining);

        let native_accum_fill_price = (max_pc_qty - pc_qty_remaining) * pc_lot_size;
        let native_pc_qty_remaining = native_pc_qty_locked - native_accum_fill_price;

        msg!("[OrderBook.new_bid] native_accum_fill_price: {}", native_accum_fill_price);
        msg!("[OrderBook.new_bid] native_pc_qty_remaining: {}", native_pc_qty_remaining);

        {
            let coin_lots_received = max_coin_qty - coin_qty_remaining;
            let native_pc_paid = native_accum_fill_price;

            to_release.credit_coin(coin_lots_received);
            to_release.debit_native_pc(native_pc_paid);
            to_release.jit_data = jit_data;

            // multiple possible counterparties
            //if native_accum_fill_price > 0 {
                let taker_fill = Event::new(EventView::Fill {
                    side: Side::Bid,
                    maker: false,
                    native_qty_paid: native_pc_paid,
                    native_qty_received: coin_lots_received * coin_lot_size,
                    order_id,
                    owner,
                    owner_slot,
                    finalised: 0,
                    cpty: owner,
                    order_id_second: 0,
                });
                let idx = event_q.head + 1;
                msg!("event id is {}", idx);

                event_q.buf[idx as usize] = taker_fill;
                event_q.head +=1;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Bid");
                msg!("event.maker: {}", "false");
                msg!("event.native_qty_paid: {}", native_pc_paid);
                msg!("event.native_qty_received: {}", coin_lots_received * coin_lot_size);
                msg!("event.order_id: {}", order_id);
                msg!("event.order_id_second: {}", 0);
                msg!("event.owner: {}", owner);
                msg!("event.owner_slot: {}", owner_slot);
                msg!("event.finalised: {}", "0");




/*
                event_q
                    .push_back(taker_fill)
                    .map_err(|_| ErrorCode::QueueAlreadyFull)?; */
           // }
        }

        if !done {
            if coin_qty_remaining > 0 && native_pc_qty_remaining > 0 {
                return Ok(Some(OrderRemaining {
                    coin_qty_remaining,
                    native_pc_qty_remaining: Some(native_pc_qty_remaining),
                }));
            }
        }

        let (coin_qty_to_post, pc_qty_to_keep_locked) = match limit_price {
            Some(price) if post_allowed && !crossed => {
                let coin_qty_to_post =
                    coin_qty_remaining.min(native_pc_qty_remaining / pc_lot_size / price);
                (coin_qty_to_post, coin_qty_to_post * price)
            }
            _ => (0, 0),
        };

        msg!("[OrderBook.new_bid] coin_qty_to_post: {}", coin_qty_to_post);
        msg!("[OrderBook.new_bid] pc_qty_to_keep_locked: {}", pc_qty_to_keep_locked);

        let out = {
            let native_qty_still_locked = pc_qty_to_keep_locked * pc_lot_size;
            let native_qty_unlocked = native_pc_qty_remaining - native_qty_still_locked;
            to_release.unlock_native_pc(native_qty_unlocked);

            let outer = Event::new(EventView::Out {
                side: Side::Bid,
                release_funds: false,
                native_qty_unlocked,
                native_qty_still_locked,
                order_id,
                owner,
                owner_slot,
                finalised: 0,
            });
            let idx = event_q.head + 1;
        msg!("event id is {}", idx);
        event_q.buf[idx as usize] = outer;
        event_q.head +=1;
        };
        let idx = event_q.head;

        let native_qty_still_locked = pc_qty_to_keep_locked * pc_lot_size;
            let native_qty_unlocked = native_pc_qty_remaining - native_qty_still_locked;
            to_release.unlock_native_pc(native_qty_unlocked);

        msg!("event.idx: {}", idx);
        msg!("event.side: {}", "Ask");
        msg!("event.release_funds: {}", "false");
        msg!("event.native_qty_unlocked: {}", native_qty_unlocked);
        msg!("event.native_qty_still_locked: {}", native_qty_still_locked);
        msg!("event.order_id: {}", order_id);
        msg!("event.order_id_second: {}", order_id);

        msg!("event.owner: {}", owner);
        msg!("owner_slot: {}", owner_slot);
        msg!("event.finalised: {}", "0");



        Ok(None)
    }
}

struct NewAskParams {
    max_qty: u64,
    limit_price: u64,
    order_id: u128,
    owner: Pubkey,
    owner_slot: u8,
    post_only: bool,
    post_allowed: bool,
}

impl<'a> OrderBook<'a> {
    fn new_ask(
        &mut self,
        params: NewAskParams,
        event_q: &mut EventQueue,
        to_release: &mut RequestProceeds,
    ) -> Result<Option<OrderRemaining>> {
        let NewAskParams {
            max_qty,
            limit_price,
            order_id,
            owner,
            owner_slot,
            post_only,
            post_allowed,
        } = params;
        let mut unfilled_qty = max_qty;
        let mut accum_fill_price = 0;

        let pc_lot_size = self.market.pc_lot_size;
        let coin_lot_size = self.market.coin_lot_size;
        let mut jit_data = vec![];

        //begin matching
        let crossed;

        let insert_result = self.asks.insert(Order {
            order_id,
            qty: unfilled_qty,
            owner,
            owner_slot,
        });
        if let Err(err) = insert_result {
            if err == error!(ErrorCode::OrdersAlreadyFull) {
                // boot out the least aggressive offer
                msg!("offers full! booting...");
                let order = self.asks.delete_worst()?;
                let out = Event::new(EventView::Out {
                    side: Side::Ask,
                    release_funds: true,
                    native_qty_unlocked: order.qty * coin_lot_size,
                    native_qty_still_locked: 0,
                    order_id: order.order_id,
                    owner: order.owner,
                    owner_slot: order.owner_slot,
                    finalised: 0,
                });
                let idx = event_q.head + 1;
                msg!("idx is {}", idx);
                event_q.buf[idx as usize] = out;
                event_q.head +=1;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Ask");
                msg!("event.release_funds: {}", true);
                msg!("event.native_qty_unlocked: {}", order.qty * coin_lot_size);
                msg!("event.native_qty_still_locked: {}", "0");
                msg!("event.order_id: {}", order.order_id);
                msg!("event.owner: {}", order.owner);
                msg!("event.owner_slot: {}", order.owner_slot);
                msg!("event.finalised: {}", "0");

/*
                event_q
                    .push_back(out)
                    .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?;*/
                self.asks.insert(Order {
                    order_id,
                    qty: unfilled_qty,
                    owner,
                    owner_slot,
                })?;
            }
        }

        let done = loop {
            let best_bid = match self.find_bbo_mut(Side::Bid) {
                Err(_) => {
                    crossed = false;
                    break true;
                }
                Ok(o) => o,
            };

            let trade_price = best_bid.price();
            crossed = limit_price <= trade_price;

            if !crossed || post_only {
                break true;
            }

            let bid_size = best_bid.qty;
            let trade_qty = bid_size.min(unfilled_qty);

            if trade_qty == 0 {
                break true;
            }

            let native_maker_pc_qty = trade_qty * trade_price * pc_lot_size;
            let jit_struct = JitStruct {
                side: Side::Bid,
                maker: true,
                native_qty_paid: native_maker_pc_qty,
                native_qty_received: trade_qty * coin_lot_size,
                order_id: best_bid.order_id,
                owner: best_bid.owner,
                owner_slot: best_bid.owner_slot,
            };
            jit_data.push(jit_struct);
            msg!("data pushed to jitstruct");

            let maker_fill = Event::new(EventView::Fill {
                side: Side::Bid,
                maker: true,
                native_qty_paid: native_maker_pc_qty,
                native_qty_received: trade_qty * coin_lot_size,
                order_id: best_bid.order_id,
                owner: best_bid.owner,
                owner_slot: best_bid.owner_slot,
                finalised: 0,
                cpty: owner,
                order_id_second: order_id,
            });
            let idx = event_q.head + 1;
            event_q.buf[idx as usize] = maker_fill;
            event_q.head +=1;
            msg!("event.idx: {}", idx);
            msg!("event.side: {}", "Ask");
            msg!("event.maker: {}", "true");
            msg!("event.native_qty_paid: {}", trade_qty * coin_lot_size);
            msg!("event.native_qty_received: {}", trade_qty * coin_lot_size);
            msg!("event.order_id: {}", best_bid.order_id);
            msg!("event.order_id_second: {}", order_id);
            msg!("event.owner: {}", best_bid.owner);
            msg!("event.owner_slot: {}", best_bid.owner_slot);
            msg!("event.finalised: {}", "0");
            msg!("event.cpty_orderid: {}", order_id);



/*
            event_q
                .push_back(maker_fill)
                .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?;*/

            best_bid.qty -= trade_qty;
            unfilled_qty -= trade_qty;
            accum_fill_price += trade_qty * trade_price;

            if best_bid.qty == 0 {
                let best_bid_id = best_bid.order_id;
                let out = Event::new(EventView::Out {
                    side: Side::Bid,
                    release_funds: true,
                    native_qty_unlocked: 0,
                    native_qty_still_locked: 0,
                    order_id: best_bid_id,
                    owner: best_bid.owner,
                    owner_slot: best_bid.owner_slot,
                    finalised: 0,
                });
                let idx = event_q.head + 1;
                event_q.buf[idx as usize] = out;
                event_q.head +=1;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Bid");
                msg!("event.release_funds: {}", "true");
                msg!("event.native_qty_unlocked: {}", "0");
                msg!("event.native_qty_locked: {}", "0");
                msg!("event.order_id: {}", order_id);
                msg!("event.order_id_second: {}", 0);
                msg!("event.owner: {}", best_bid.owner);
                msg!("event.owner_slot: {}", best_bid.owner_slot);
                msg!("event.finalised: {}", "0");


                /*event_q
                    .push_back(Event::new(EventView::Out {
                        side: Side::Bid,
                        release_funds: true,
                        native_qty_unlocked: 0,
                        native_qty_still_locked: 0,
                        order_id: best_bid_id,
                        owner: best_bid.owner,
                        owner_slot: best_bid.owner_slot,
                    }))
                    .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?;*/
                //self.bids.delete(best_bid_id)?;
            }

            break false;
        };

        let native_taker_pc_qty = accum_fill_price * pc_lot_size;

        {
            let net_taker_pc_qty = native_taker_pc_qty;
            let coin_lots_traded = max_qty - unfilled_qty;

            to_release.credit_native_pc(net_taker_pc_qty);
            to_release.debit_coin(coin_lots_traded);
            to_release.jit_data = jit_data;
            if native_taker_pc_qty > 0 {
                let taker_fill = Event::new(EventView::Fill {
                    side: Side::Ask,
                    maker: false,
                    native_qty_paid: coin_lots_traded * coin_lot_size,
                    native_qty_received: net_taker_pc_qty,
                    order_id,
                    owner,
                    owner_slot,
                    finalised: 0,
                    cpty: owner,
                    order_id_second: 0,
                });
                let idx = event_q.head + 1;
                event_q.buf[idx as usize] = taker_fill;
                event_q.head +=1;

                msg!("event.idx: {}", idx);
                msg!("event.side: {}", "Ask");
                msg!("event.maker: {}", "false");
                msg!("event.native_qty_paid: {}", coin_lots_traded * coin_lot_size);
                msg!("event.native_qty_received: {}", net_taker_pc_qty);
                msg!("event.order_id: {}", order_id);
                msg!("event.order_id_second: {}", 0);
                msg!("event.owner: {}", owner);
                msg!("event.owner_slot: {}", owner_slot);
                msg!("event.finalised: {}", "0");



/*
                event_q
                    .push_back(taker_fill)
                    .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?;*/
            }
        }

        if !done {
            if unfilled_qty > 0 {
                return Ok(Some(OrderRemaining {
                    coin_qty_remaining: unfilled_qty,
                    native_pc_qty_remaining: None,
                }));
            }
        }

        if post_allowed && !crossed && unfilled_qty > 0 {
       
        } else {
            to_release.unlock_coin(unfilled_qty);
            let out = Event::new(EventView::Out {
                side: Side::Ask,
                release_funds: false,
                native_qty_unlocked: unfilled_qty * coin_lot_size,
                native_qty_still_locked: 0,
                order_id,
                owner,
                owner_slot,
                finalised: 0,
            });
            let idx = event_q.head + 1;
            event_q.buf[idx as usize] = out;
            event_q.head +=1;

            msg!("event.idx: {}", idx);
            msg!("event.side: {}", "Ask");
            msg!("event.release_funds: {}", false);
            msg!("event.native_qty_unlocked: {}", unfilled_qty * coin_lot_size);
            msg!("event.native_qty_still_locked: {}", "0");
            msg!("event.order_id: {}", order_id);
            msg!("event.order_id_second: {}", 0);
            msg!("event.owner: {}", owner);
            msg!("event.owner.slot: {}", owner_slot);
            msg!("event.finalised: {}", "0");
/*
            event_q
                .push_back(out)
                .map_err(|_| error!(ErrorCode::QueueAlreadyFull))?;*/
        }

        Ok(None)
    }
}

pub struct CancelOrderParams {
    side: Side,
    order_id: u128,
    expected_owner: Pubkey,
    expected_owner_slot: u8,
}

impl<'a> OrderBook<'a> {
    fn cancel_order(&mut self, params: CancelOrderParams, event_q: &mut EventQueue) -> Result<()> { 
        let CancelOrderParams {
            side,
            order_id,
            expected_owner,
            expected_owner_slot,
        } = params; 
        Ok(())
    }

    fn cancel_order_bid(&mut self, side: bool, order_id: u128, owner: Pubkey) -> Result<()> {
       
        //  pub fn remove_order_by_id_and_owner(&mut self, side: bool, order_id: u128, owner: Pubkey) -> Result<(), ErrorCode> {
        //let orders = if side { &mut *self.bids } else { &mut *self.asks };
        let orders = &mut *self.bids;
        orders.delete(order_id);

        
            Ok(())
        }

        fn cancel_order_ask(&mut self, side: bool, order_id: u128, owner: Pubkey) -> Result<()> {
       
            //  pub fn remove_order_by_id_and_owner(&mut self, side: bool, order_id: u128, owner: Pubkey) -> Result<(), ErrorCode> {
            //let orders = if side { &mut *self.bids } else { &mut *self.asks };
            let orders = &mut *self.asks;
            orders.delete(order_id);
    
            //if let Some(leaf_node) = self.orders_mut(side).remove_by_key(order_id) {
              //  } else {
                //    self.orders_mut(side).insert_leaf(&leaf_node).unwrap();
              //  }
                Ok(())
            }
        

        
    }


#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Market::MAX_SIZE,
        seeds = [b"market".as_ref(), coin_mint.key().as_ref(), pc_mint.key().as_ref()],
        bump,
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = pc_mint,
        associated_token::authority = market,
    )]
    pub pc_vault: Box<Account<'info, TokenAccount>>,

    pub coin_mint: Account<'info, Mint>,
    pub pc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Bids::MAX_SIZE,
        seeds = [b"bids".as_ref(), market.key().as_ref()],
        bump,
    )]
    pub bids: Box<Account<'info, Bids>>,
    #[account(
        init,
        payer = authority,
        space = 8 + Asks::MAX_SIZE,
        seeds = [b"asks".as_ref(), market.key().as_ref()],
        bump,
    )]
    pub asks: Box<Account<'info, Asks>>,

    #[account(
        init,
        payer = authority,
        space = 8 + RequestQueue::MAX_SIZE,
        seeds = [b"req-q".as_ref(), market.key().as_ref()],
        bump,
    )]
    pub req_q: Box<Account<'info, RequestQueue>>,
    #[account(
        //zero,
        init,
        payer = authority,
        space = 8 * 1264,
        seeds = [b"event-q".as_ref(), market.key().as_ref()],
        bump,
    )]
    pub event_q: AccountLoader<'info, EventQueue>,

    //pub event_q: Box<Account<'info, EventQueue>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Copy, Debug, Clone, PartialEq, AnchorSerialize, AnchorDeserialize)]
pub enum Side {
    Bid = 0,
    Ask = 1,
}

#[derive(Copy, Clone, AnchorSerialize, AnchorDeserialize)]
pub enum OrderType {
    Limit = 0,
    ImmediateOrCancel = 1,
    PostOnly = 2,
}

#[account]
#[derive(Default)]
pub struct OpenOrders {
    is_initialized: bool,

    market: Pubkey,
    authority: Pubkey,

    native_coin_free: u64,
    native_pc_free: u64,

    native_coin_total: u64,
    native_pc_total: u64,

    free_slot_bits: u8,
    is_bid_bits: u8,
    orders: [u128; 8],
}

impl OpenOrders {
    pub const MAX_SIZE: usize = 1 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 1 + 8 * 16;

    fn init(&mut self, market: Pubkey, authority: Pubkey) -> Result<()> {
        require!(!self.is_initialized, ErrorCode::AlreadyInitialized);

        self.is_initialized = true;
        self.market = market;
        self.authority = authority;
        self.free_slot_bits = std::u8::MAX;

        Ok(())
    }

    fn credit_unlocked_coin(&mut self, native_coin_amount: u64) {
        self.native_coin_total = self
            .native_coin_total
            .checked_add(native_coin_amount)
            .unwrap();
        self.native_coin_free = self.native_coin_free.checked_add(native_coin_amount).unwrap();
    }

    fn credit_locked_coin(&mut self, native_coin_amount: u64) {
        self.native_coin_total = self
            .native_coin_total
            .checked_add(native_coin_amount)
            .unwrap();
    }

    fn credit_unlocked_pc(&mut self, native_pc_amount: u64) {
        self.native_pc_total = self.native_pc_total.checked_add(native_pc_amount).unwrap();
        self.native_pc_free = self.native_pc_free.checked_add(native_pc_amount).unwrap();
    }

    fn credit_locked_pc(&mut self, native_pc_amount: u64) {
        self.native_pc_total = self.native_pc_total.checked_add(native_pc_amount).unwrap();
    }

    fn lock_free_coin(&mut self, native_coin_amount: u64) {
        self.native_coin_free = self
            .native_coin_free
            .checked_sub(native_coin_amount)
            .unwrap();
    }

    fn lock_free_pc(&mut self, native_pc_amount: u64) {
        self.native_pc_free = self.native_pc_free.checked_sub(native_pc_amount).unwrap();
    }

    pub fn unlock_coin(&mut self, native_coin_amount: u64) {
        self.native_coin_free = self
            .native_coin_free
            .checked_add(native_coin_amount)
            .unwrap();
        assert!(self.native_coin_free <= self.native_coin_total);
    }

    pub fn unlock_pc(&mut self, native_pc_amount: u64) {
        self.native_pc_free = self.native_pc_free.checked_add(native_pc_amount).unwrap();
        assert!(self.native_pc_free <= self.native_pc_total);
    }

    fn slot_is_free(&self, slot: u8) -> bool {
        let slot_mask = 1u8 << slot;
        self.free_slot_bits & slot_mask != 0
    }

    

    pub fn slot_side(&self, slot: u8) -> Option<Side> {
        let slot_mask = 1u8 << slot;
        if self.free_slot_bits & slot_mask != 0 {
            None
        } else if self.is_bid_bits & slot_mask != 0 {
            Some(Side::Bid)
        } else {
            Some(Side::Ask)
        }
    }

    pub fn remove_order(&mut self, slot: u8) -> Result<()> {
        // check_assert!(slot < 128)?;
        // check_assert!(!self.slot_is_free(slot))?;
        //require!(self.slot_is_free(slot), ErrorCode::SlotIsNotFree);

        let slot_mask = 1u8 << slot;
        self.orders[slot as usize] = 0;
        self.free_slot_bits |= slot_mask;
        self.is_bid_bits &= !slot_mask;

        Ok(())
    }

    fn add_order(&mut self, id: u128, side: Side) -> Result<u8> {
        //remove oldest order if openorders is full
        if self.free_slot_bits == 0 {
            self.remove_order(0)?;
        } 
        //require!(self.free_slot_bits != 0, ErrorCode::TooManyOpenOrders);
        let slot = self.free_slot_bits.trailing_zeros() as u8;
        require!(self.slot_is_free(slot), ErrorCode::SlotIsNotFree);
        let slot_mask = 1u8 << slot;
        self.free_slot_bits &= !slot_mask;
        match side {
            Side::Bid => {
                self.is_bid_bits |= slot_mask;
            }
            Side::Ask => {
                self.is_bid_bits &= !slot_mask;
            }
        };
        self.orders[slot as usize] = id;
        Ok(slot as u8)
    }
}


#[derive(Accounts)]
//#[instruction(side: Side)]

pub struct FinaliseMatch<'info>{
    #[account(
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub open_orders_owner: Box<Account<'info, OpenOrders>>,

    #[account(
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub open_orders_cpty: Box<Account<'info, OpenOrders>>,

    #[account(
        seeds = [b"market".as_ref(), coin_mint.key().as_ref(), pc_mint.key().as_ref()],
        bump,
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        mut,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = pc_mint,
        associated_token::authority = market,
    )]
    pub pc_vault: Account<'info, TokenAccount>,

    pub coin_mint: Account<'info, Mint>,
    pub pc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub bids: Box<Account<'info, Bids>>,
    #[account(mut)]
    pub asks: Box<Account<'info, Asks>>,

    #[account(mut)]
    pub req_q: Box<Account<'info, RequestQueue>>,
    #[account(mut)]
    pub event_q: AccountLoader<'info, EventQueue>,

    #[account(
        mut,
        //constraint = market.check_payer_mint(payer.mint, side) @ ErrorCode::WrongPayerMint,
        token::authority = authority,
    )]
    pub pcpayer: Account<'info, TokenAccount>,

    #[account(
        mut,
        //constraint = market.check_payer_mint(payer.mint, side) @ ErrorCode::WrongPayerMint,
        token::authority = authority,
    )]
    pub coinpayer: Account<'info, TokenAccount>,
    //pub event_q: Box<Account<'info, EventQueue>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    //#[account(mut)]
    //pub authority_cpty: Account<'info, AccountInfo>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,



}


#[derive(Accounts)]
#[instruction(side: Side)]
pub struct NewOrder<'info> {
    #[account(
        init_if_needed,
        space = 8 + OpenOrders::MAX_SIZE,
        payer = authority,
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub open_orders: Box<Account<'info, OpenOrders>>,

    #[account(
        seeds = [b"market".as_ref(), coin_mint.key().as_ref(), pc_mint.key().as_ref()],
        bump,
    )]
    pub market: Box<Account<'info, Market>>,

    #[account(
        mut,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = pc_mint,
        associated_token::authority = market,
    )]
    pub pc_vault: Account<'info, TokenAccount>,

    pub coin_mint: Account<'info, Mint>,
    pub pc_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = market.check_payer_mint(payer.mint, side) @ ErrorCode::WrongPayerMint,
        token::authority = authority,
    )]
    pub payer: Account<'info, TokenAccount>,

    #[account(mut)]
    pub bids: Box<Account<'info, Bids>>,
    #[account(mut)]
    pub asks: Box<Account<'info, Asks>>,

    #[account(mut)]
    pub req_q: Box<Account<'info, RequestQueue>>,
    #[account(mut)]
    //pub event_q: Box<Account<'info, EventQueue>>,
    pub event_q: AccountLoader<'info, EventQueue>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
//#[instruction(side: Side)]

pub struct NewMatch<'info>{
    #[account(
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub open_orders_owner: Box<Account<'info, OpenOrders>>,

    #[account(
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority_second.key().as_ref()],
        bump,
    )]
    //#[account(mut)]
    pub open_orders_counterparty: Box<Account<'info, OpenOrders>>,


   #[account(
      seeds = [b"market".as_ref(), coin_mint.key().as_ref(), pc_mint.key().as_ref()],
      bump,
    )] 
   // #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    /*
    #[account(
        mut,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Account<'info, TokenAccount>,
*/
    /*#[account(
        mut,
        associated_token::mint = pc_mint,
        associated_token::authority = market,
    )] */
    #[account(mut)]
    pub pc_vault: Account<'info, TokenAccount>, 

    pub coin_mint: Account<'info, Mint>,
    pub pc_mint: Account<'info, Mint>,
    /*
    #[account(mut)]
    pub bids: Box<Account<'info, Bids>>,
    #[account(mut)]
    pub asks: Box<Account<'info, Asks>>, */

    #[account(mut)]
    pub req_q: Box<Account<'info, RequestQueue>>,
    #[account(mut)]
    pub event_q: AccountLoader<'info, EventQueue>,
    pub authority: Signer<'info>,


    #[account(mut)]
    pub authority_second: Signer<'info>,

    #[account(
        mut,
       // constraint = market.check_payer_mint(payer.mint, side) @ ErrorCode::WrongPayerMint,
        //token::authority = authority_second,
    )]
    pub pcpayer: Account<'info, TokenAccount>,
 

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,



}

#[derive(Accounts)]
pub struct NewMatchAsk<'info>{
    #[account(
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority.key().as_ref()],
        bump,
    )]
    pub open_orders_owner: Box<Account<'info, OpenOrders>>,

    #[account(
        seeds = [b"open-orders".as_ref(), market.key().as_ref(), authority_second.key().as_ref()],
        bump,
    )]
   // #[account(mut)]
    pub open_orders_counterparty: Box<Account<'info, OpenOrders>>,


    #[account(
        seeds = [b"market".as_ref(), coin_mint.key().as_ref(), pc_mint.key().as_ref()],
        bump,
    )]
    pub market: Box<Account<'info, Market>>,
    /*
    #[account(
        mut,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Account<'info, TokenAccount>,
*/
    #[account(
        mut,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Account<'info, TokenAccount>, 

    pub coin_mint: Account<'info, Mint>,
    pub pc_mint: Account<'info, Mint>,
    /*
    #[account(mut)]
    pub bids: Box<Account<'info, Bids>>,
    #[account(mut)]
    pub asks: Box<Account<'info, Asks>>, */

    #[account(mut)]
    pub req_q: Box<Account<'info, RequestQueue>>,
    #[account(mut)]
    pub event_q: AccountLoader<'info, EventQueue>,
    pub authority: Signer<'info>,


    #[account(mut)]
    pub authority_second: Signer<'info>,

    #[account(
        mut,
       // constraint = market.check_payer_mint(payer.mint, side) @ ErrorCode::WrongPayerMint,
       // token::authority = authority_second,
    )]
    pub coinpayer: Account<'info, TokenAccount>,
 

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,



}

#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub payer: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub open_orders: Box<Account<'info, OpenOrders>>,
    //pub system_program: Program<'info, System>,
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub open_orders: Box<Account<'info, OpenOrders>>,

    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub bids: Box<Account<'info, Bids>>,
    #[account(mut)]
    pub asks: Box<Account<'info, Asks>>,
    #[account(mut)]
    pub event_q: AccountLoader<'info, EventQueue>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(mut)]
    pub market: Box<Account<'info, Market>>,
    #[account(mut)]
    pub payer: Account<'info, TokenAccount>,
    pub coin_mint: Account<'info, Mint>,
    pub pc_mint: Account<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = coin_mint,
        associated_token::authority = market,
    )]
    pub coin_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = pc_mint,
        associated_token::authority = market,
    )]
    pub pc_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub open_orders: Box<Account<'info, OpenOrders>>,
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,

}

#[error_code]
pub enum ErrorCode {
    #[msg("Wrong payer mint")]
    WrongPayerMint,
    #[msg("Wrong market")]
    WrongMarket,
    #[msg("Wrong authority")]
    WrongAuthority,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Transfer failed")]
    TransferFailed,

    #[msg("Already initialized")]
    AlreadyInitialized,

    #[msg("Queue already full")]
    QueueAlreadyFull,
    #[msg("Empty queue")]
    EmptyQueue,

    #[msg("Too many open orders")]
    TooManyOpenOrders,

    #[msg("Slot is not free")]
    SlotIsNotFree,

    #[msg("Empty orders")]
    EmptyOrders,
    #[msg("Orders already full")]
    OrdersAlreadyFull,

    #[msg("Invalid price")]
    InvalidPrice,

    #[msg("Insufficient native qty locked")]
    InvalidLocked,

    #[msg("OrderNotFound")]
    OrderNotFound,

    #[msg("InvalidAuthority")]
    InvalidAuthority,

    #[msg("Error")]
    Error,
}
