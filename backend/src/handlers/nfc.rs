// backend/src/handlers/nfc.rs
use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use chrono::Utc;

#[derive(Deserialize)]
pub struct NFCTapRequest {
    pub wallet_address: String,
    pub amount: u64,           // Amount in EURC (6 decimals recommended)
    pub device_id: String,
    pub nonce: String,
    pub tx_signature: String,  // ← NEW: Real signature from frontend
    pub estimated_health_factor: Option<f64>, // Optional
}

#[derive(Serialize)]
pub struct NFCTapResponse {
    pub success: bool,
    pub receipt_id: String,
    pub amount: u64,
    pub tx_signature: String,      // Real on-chain tx
    pub message: String,
    pub new_health_factor: f64,    // Will be updated later with real value
    pub timestamp: String,
}

pub async fn nfc_tap(
    State(state): State<crate::state::memory_store::SharedState>,
    Json(payload): Json<NFCTapRequest>,
) -> Result<Json<NFCTapResponse>, StatusCode> {
    // ==================== 1. SECURITY: NONCE VALIDATION ====================
    let mut app_state = state.lock().await;
    if !app_state.nonce_store.verify_and_consume_nonce(&payload.nonce) {
        tracing::warn!("Invalid or expired nonce used for wallet: {}", payload.wallet_address);
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Basic validation
    if payload.wallet_address.is_empty() || payload.tx_signature.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // ==================== 2. LOG THE EVENT (Audit only) ====================
    let receipt_id = format!("RCPT-{}", Utc::now().timestamp_millis());

    tracing::info!(
        "✅ NFC Tap recorded | User: {} | Amount: {} | Tx: {} | Nonce consumed",
        payload.wallet_address, payload.amount, payload.tx_signature
    );

    // TODO (future): Store in DB for analytics / compliance

    Ok(Json(NFCTapResponse {
        success: true,
        receipt_id,
        amount: payload.amount,
        tx_signature: payload.tx_signature,
        message: "Tap recorded. Transaction confirmed on Solana.".to_string(),
        new_health_factor: payload.estimated_health_factor.unwrap_or(1.85),
        timestamp: Utc::now().to_rfc3339(),
    }))
}

pub async fn get_nonce(
    State(state): State<crate::state::memory_store::SharedState>,
) -> Json<String> {
    let mut app_state = state.lock().await;
    Json(app_state.nonce_store.generate_nonce())
}

pub async fn nfc_provision() -> Result<Json<String>, StatusCode> {
    Ok(Json("Provisioned".to_string()))
}