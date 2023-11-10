use anchor_lang::{prelude::*, accounts::account_info};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount, Transfer, Approve},
};
//use solana_sdk::instruction::{AccountMeta, Instruction};

use anchor_spl::token::accessor::authority;
use enumflags2::{bitflags, BitFlags};
use resp;


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
