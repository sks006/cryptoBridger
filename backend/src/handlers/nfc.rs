// backend/src/handlers/nfc.rs
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::Utc;

use crate::state::memory_store::{AppState, SharedState};
use crate::solana::{client::SolanaClient, vault_ix};

#[derive(Deserialize)]
pub struct NFCTapRequest {
    pub wallet_address: String,
    pub amount: u64,           // Amount in EURC (e.g. 500 = €5.00)
    pub device_id: String,
    pub nonce: String,
}

#[derive(Serialize)]
pub struct NFCTapResponse {
    pub success: bool,
    pub receipt_id: String,
    pub amount: u64,
    pub tx_signature: String,
    pub message: String,
    pub new_health_factor: f64,
    pub timestamp: String,
}

pub async fn nfc_tap(
    State(state): State<SharedState>,
    Json(payload): Json<NFCTapRequest>,
) -> Result<Json<NFCTapResponse>, StatusCode> {
    // ==================== 1. SECURITY: NONCE VALIDATION ====================
    let mut app_state = state.lock().await;
    if !app_state.nonce_store.verify_and_consume_nonce(&payload.nonce) {
        tracing::warn!("Invalid or expired nonce used");
        return Err(StatusCode::UNAUTHORIZED);
    }

    // ==================== 2. BUILD BORROW INSTRUCTION ====================
    let user_pubkey = payload.wallet_address
        .parse::<solana_sdk::pubkey::Pubkey>()
        .map_err(|_| {
            tracing::error!("Invalid wallet address: {}", payload.wallet_address);
            StatusCode::BAD_REQUEST
        })?;

    let borrow_ix = vault_ix::build_borrow_ix(user_pubkey, payload.amount);

    // ==================== 3. LOAD AUTHORITY KEYPAIR ====================
    let authority_raw = std::env::var("AUTHORITY_KEYPAIR")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let authority_bytes: Vec<u8> = serde_json::from_str(&authority_raw)
        .map_err(|e| {
            tracing::error!("Failed to parse AUTHORITY_KEYPAIR: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let authority_keypair = solana_sdk::signer::keypair::Keypair::from_bytes(&authority_bytes)
        .map_err(|e| {
            tracing::error!("Invalid authority keypair: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // ==================== 4. EXECUTE ON-CHAIN TRANSACTION ====================
    let rpc_url = std::env::var("SOLANA_RPC_URL")
        .unwrap_or_else(|_| "https://api.devnet.solana.com".to_string());

    let client = SolanaClient::new(&rpc_url);

    let signature = client.send_and_confirm_jit_tx(borrow_ix, &authority_keypair)
        .await
        .map_err(|e| {
            tracing::error!("Transaction failed: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // ==================== 5. LOG & RETURN RECEIPT ====================
    let receipt_id = format!("RCPT-{}", Utc::now().timestamp_millis());

    tracing::info!(
        "✅ NFC Tap successful | User: {} | Amount: {} | Tx: {}",
        payload.wallet_address, payload.amount, signature
    );

    Ok(Json(NFCTapResponse {
        success: true,
        receipt_id,
        amount: payload.amount,
        tx_signature: signature.to_string(),
        message: "JIT Borrow + Payment approved on Solana".to_string(),
        new_health_factor: 1.85,           // TODO: Fetch real HF from on-chain later
        timestamp: Utc::now().to_rfc3339(),
    }))
}

// Optional: Keep this for future real Web NFC flow
pub async fn get_nonce(
    State(state): State<SharedState>,
) -> Json<String> {
    let mut app_state = state.lock().await;
    Json(app_state.nonce_store.generate_nonce())
}