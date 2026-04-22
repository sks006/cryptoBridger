// backend/src/handlers/nfc.rs
//
// This file handles all NFC-related requests from the frontend.
// It is the bridge between the user's phone tap and your Solana lending vault.

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::Utc;
use uuid::Uuid;

use crate::state::memory_store::AppState;

// ─────────────────────────────────────────────────────────────
// 1. GET /nfc/nonce  → Generate a one-time security code
// ─────────────────────────────────────────────────────────────
// Why: Prevents replay attacks. Frontend must send a fresh nonce with every tap.

#[derive(Serialize)]
pub struct NonceResponse {
    pub nonce: String,
}

pub async fn get_nonce(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<NonceResponse> {
    let mut app_state = state.lock().await;
    let nonce = app_state.nonce_store.generate_nonce();

    Json(NonceResponse { nonce })
}

// ─────────────────────────────────────────────────────────────
// 2. POST /nfc/tap   → Main tap handler (the core feature)
// ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct NFCTapRequest {
    pub wallet_address: String,     // User's Solana wallet
    pub amount: u64,                // Amount in smallest unit (e.g. USDC with 6 decimals)
    pub device_id: String,          // Phone/device identifier
    pub nonce: String,              // Security nonce from /nfc/nonce
    pub merchant_data: Option<serde_json::Value>, // Optional merchant info from NFC tag
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NFCTapResponse {
    pub success: bool,
    pub receipt_id: String,
    pub amount: u64,
    pub merchant_name: String,
    pub timestamp: String,
    pub new_health_factor: f64,     // Updated after repay
    pub message: String,
}

pub async fn nfc_tap(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(payload): Json<NFCTapRequest>,
) -> Result<Json<NFCTapResponse>, (StatusCode, Json<serde_json::Value>)> {
    let mut app_state = state.lock().await;

    // 1. Validation
    if payload.amount == 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "message": "Amount must be greater than zero" })),
        ));
    }

    // 2. Security: Verify nonce (one-time use)
    if !app_state.nonce_store.verify_and_consume_nonce(&payload.nonce) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "message": "Invalid or expired nonce. Please refresh and try again." })),
        ));
    }

    // 3. Extract merchant name (fallback for demo)
    let merchant_name = payload
        .merchant_data
        .as_ref()
        .and_then(|d| d.get("merchantName"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or("Crypto Terminal")
        .to_string();

    // 4. Simulate payment (MVP)
    // In real version: Call your Solana lending_vault repay instruction here
    let receipt_id = format!("RCPT-{}", Uuid::new_v4().simple());

    // Log the tap for demo/analytics
    let record = crate::state::memory_store::NfcTapRecord {
        timestamp: Utc::now().timestamp(),
        amount: payload.amount,
        receipt_id: receipt_id.clone(),
    };
    app_state
        .nfc_taps
        .entry(payload.wallet_address.clone())
        .or_default()
        .push(record);

    // 5. Return success response
    Ok(Json(NFCTapResponse {
        success: true,
        receipt_id,
        amount: payload.amount,
        merchant_name,
        timestamp: Utc::now().to_rfc3339(),
        new_health_factor: 1.92,           // Simulated improvement after repay
        message: "Payment approved via JIT liquidity on Solana".to_string(),
    }))
}

// ─────────────────────────────────────────────────────────────
// 3. POST /nfc/provision → Mock Apple/Google Pay provisioning
// ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct NFCProvisionRequest {
    pub wallet_pubkey: String,
    pub device_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NFCProvisionResponse {
    pub pan_token: String,
    pub expiry: String,
    pub device_id: String,
}

pub async fn nfc_provision(
    Json(payload): Json<NFCProvisionRequest>,
) -> Json<NFCProvisionResponse> {
    let device_id = payload.device_id.unwrap_or_else(|| format!("dev_{}", Uuid::new_v4().simple()));

    Json(NFCProvisionResponse {
        pan_token: format!("TKN-{}", Uuid::new_v4().simple()),
        expiry: "12/28".to_string(),
        device_id,
    })
}