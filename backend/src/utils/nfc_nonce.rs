// backend/src/utils/nfc_nonce.rs
//
// One-time nonce store with 5-minute TTL.
// Shared via Arc<NonceStore> in AppState.

use std::collections::HashMap;
use std::sync::Mutex;
use chrono::Utc;
use uuid::Uuid;

pub struct NonceStore {
    /// nonce_string → unix timestamp of expiry
    nonces: Mutex<HashMap<String, i64>>,
}

impl NonceStore {
    pub fn new() -> Self {
        Self {
            nonces: Mutex::new(HashMap::new()),
        }
    }

    /// Generate a new UUID nonce valid for 5 minutes.
    pub fn generate_nonce(&self) -> String {
        let nonce = Uuid::new_v4().to_string();
        let expiry = Utc::now().timestamp() + 300;
        self.nonces.lock().unwrap().insert(nonce.clone(), expiry);
        nonce
    }

    /// Verify a nonce is valid and consume it (single use).
    /// Returns false if the nonce is unknown or expired.
    pub fn verify_and_consume(&self, nonce: &str) -> bool {
        let mut guard = self.nonces.lock().unwrap();
        match guard.get(nonce) {
            Some(&expiry) if expiry > Utc::now().timestamp() => {
                guard.remove(nonce);
                true
            }
            _ => false,
        }
    }

    /// Remove all expired nonces (call periodically from a background task).
    pub fn sweep_expired(&self) {
        let now = Utc::now().timestamp();
        self.nonces
            .lock()
            .unwrap()
            .retain(|_, &mut expiry| expiry > now);
    }
}