use serde::Deserialize;

#[derive(Deserialize)]
pub struct QuoteResponse {
    pub out_amount: String, // Jupiter returns strings to avoid float precision loss
}

pub async fn get_jit_quote(eur_amount: u64) -> Result<u64, Box<dyn std::error::Error>> {
    // Logic: Convert EURC/USDC to SOL 
    // Entry: User wants to spend X EUR
    let url = format!(
        "https://quote-api.jup.ag/v6/quote?inputMint=EURC_MINT_ADDRESS&outputMint=SOL_MINT_ADDRESS&amount={}", 
        eur_amount
    );
    
    let resp = reqwest::get(url).await?.json::<QuoteResponse>().await?;
    
    // Transformation: String -> u64
    Ok(resp.out_amount.parse::<u64>()?)
}