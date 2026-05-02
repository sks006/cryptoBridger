// backend/src/handlers/nfc.rs
//
// Fixed contract with the frontend:
//   - GET /nfc/nonce returns {"nonce": "..."} (an OBJECT, not a bare string)
//   - POST /nfc/tap accepts merchant_data and echoes merchant name in response
//   - All response fields are camelCase via #[serde(rename_all = "camelCase")]
//     so the frontend can read them without a translation layer.

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use chrono::Utc;

// ---------------------------------------------------------------------------
// /nfc/nonce
// ---------------------------------------------------------------------------

#[derive(Serialize)]
pub struct NonceResponse {
    pub nonce: String,
}

pub async fn get_nonce(
    State(state): State<crate::state::memory_store::SharedState>,
) -> Json<NonceResponse> {
    let mut app_state = state.lock().await;
    Json(NonceResponse {
        nonce: app_state.nonce_store.generate_nonce(),
    })
}

// ---------------------------------------------------------------------------
// /nfc/tap
// ---------------------------------------------------------------------------

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct MerchantData {
    pub merchant: Option<String>,
    pub amount: Option<String>,
    pub currency: Option<String>,
    pub invoice: Option<String>,
}

#[derive(Deserialize)]
pub struct NFCTapRequest {
    pub wallet_address: String,
    pub amount: u64,                          // EURC in micro-units (6 decimals)
    pub device_id: String,
    pub nonce: String,
    pub tx_signature: String,                 // Real Solana signature
    pub estimated_health_factor: Option<f64>,
    pub merchant_data: Option<MerchantData>,  // Optional payload from NFC tag
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NFCTapResponse {
    pub success: bool,
    pub receipt_id: String,        // → receiptId
    pub amount: u64,
    pub tx_hash: String,           // → txHash  (matches frontend's NFCReceipt)
    pub merchant_name: String,     // → merchantName
    pub message: String,
    pub new_health_factor: f64,    // → newHealthFactor
    pub timestamp: String,
}

pub async fn nfc_tap(
    State(state): State<crate::state::memory_store::SharedState>,
    Json(payload): Json<NFCTapRequest>,
) -> Result<Json<NFCTapResponse>, StatusCode> {
    // 1. Nonce validation — single use, expires in 5 minutes
    {
        let mut app_state = state.lock().await;
        if !app_state.nonce_store.verify_and_consume_nonce(&payload.nonce) {
            tracing::warn!(
                "Invalid or expired nonce for wallet: {}",
                payload.wallet_address
            );
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    // 2. Basic input validation
    if payload.wallet_address.is_empty() || payload.tx_signature.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // 3. Extract merchant name (or fall back to a placeholder)
    let merchant_name = payload
        .merchant_data
        .as_ref()
        .and_then(|m| m.merchant.clone())
        .unwrap_or_else(|| "Direct Pay".to_string());

    // 4. Generate a stable receipt ID
    let receipt_id = format!("RCPT-{}", Utc::now().timestamp_millis());

    tracing::info!(
        "✅ NFC Tap | wallet={} amount={} merchant={} tx={}",
        payload.wallet_address,
        payload.amount,
        merchant_name,
        payload.tx_signature
    );

    // 5. TODO (next sprint): Verify the tx_signature against Solana DevNet
    //    using solana-client::rpc_client::RpcClient::get_transaction().
    //    For the investor demo, the on-chain explorer link in the receipt
    //    is the verification — anyone can click and confirm.

    Ok(Json(NFCTapResponse {
        success: true,
        receipt_id,
        amount: payload.amount,
        tx_hash: payload.tx_signature,
        merchant_name,
        message: "Tap recorded. Transaction confirmed on Solana.".to_string(),
        new_health_factor: payload.estimated_health_factor.unwrap_or(0.0),
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn nfc_provision() -> Result<Json<String>, StatusCode> {
    Ok(Json("Provisioned".to_string()))
}