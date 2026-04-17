use std::env;

fn main() {
    // Load environment variables from .env file
    dotenv::dotenv().ok();

    // Example of using environment variables
    let sol_price = env::var("SOL_PRICE").unwrap_or_else(|_| "Not set".to_string());
    let eur_price = env::var("EUR_PRICE").unwrap_or_else(|_| "Not set".to_string());

    println!("SOL Price Feed: {}", sol_price);
    println!("EUR Price Feed: {}", eur_price);
    println!("Hello, world!");
}
