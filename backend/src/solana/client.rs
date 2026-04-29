// backend/src/solana/client.rs
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::{
    message::Message,
    signature::{Keypair, Signature},
    signer::Signer,
    transaction::Transaction,
};
use std::error::Error;

pub struct SolanaClient {
    pub rpc: RpcClient,
}

impl SolanaClient {
    pub fn new(url: &str) -> Self {
        Self {
            rpc: RpcClient::new(url.to_string()),
        }
    }

    /// Sends a signed transaction and waits for confirmation.
    /// This is the core JIT execution path.
    pub async fn send_and_confirm_jit_tx(
        &self,
        instruction: solana_sdk::instruction::Instruction,
        authority_keypair: &Keypair,
    ) -> Result<Signature, Box<dyn Error>> {
        // 1. Get fresh blockhash (mandatory)
        let recent_blockhash = self.rpc.get_latest_blockhash().await?;

        // 2. Create transaction with authority as fee payer + signer
        let tx = Transaction::new_signed_with_payer(
            &[instruction],
            Some(&authority_keypair.pubkey()),
            &[authority_keypair],
            recent_blockhash,
        );

        // 3. Send and confirm
        let signature = self.rpc
            .send_and_confirm_transaction_with_spinner(&tx)
            .await?;

        Ok(signature)
    }
}