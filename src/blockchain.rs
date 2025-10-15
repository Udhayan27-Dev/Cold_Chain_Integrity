use crate::models::VaccineData;
use crate::db;
use sha2::{Sha256, Digest};
use rand::prelude::*;
use rand::rngs::StdRng;
use tokio::time::{sleep, Duration};
use chrono::Utc;
use sqlx::PgPool;

/// Start the random vaccine data generator
pub async fn start_generator(pool: PgPool) {
    // Fixed batch and container for prototype
    let fixed_batch = "VAC-000123".to_string();
    let fixed_container = "CONT-0001".to_string();

    let mut prev_hash = "0".to_string();
    let mut index: i64 = 1;

    // Create a thread-safe random number generator
    let mut rng = StdRng::seed_from_u64(42); // Using fixed seed for reproducible results
    // Wider temperature range to simulate both low and high temperature excursions
    let low_temp = 0.0;
    let high_temp = 12.0;

    loop {
        // Generate random temperature between low_temp and high_temp
        let temp: f32 = rng.random_range(low_temp..=high_temp);

        // Create vaccine data
        let data = VaccineData {
            temperature: temp,
            container_no: fixed_container.clone(),
            batch_no: fixed_batch.clone(),
            vaccine_name: "Covishield".to_string(),
            manufacture_name: "Serum Institute".to_string(),
            shipment_name: "BlueDart".to_string(),
            current_location: "Mumbai".to_string(),
            timestamp: Utc::now().to_rfc3339(),
        };

        // Serialize payload and compute payload hash
        let payload_str = serde_json::to_string(&data).unwrap();
        let payload_hash = compute_hash(&payload_str);

        // Compute block hash: index + payload_hash + prev_hash
        let block_hash = compute_hash(&format!("{}|{}|{}", index, payload_hash, prev_hash));

        // Check if temperature is out of safe range
        let alert = temp < 2.0 || temp > 8.0;

        // Insert block into PostgreSQL
        if let Err(e) = db::insert_block(&pool, index, &data, &payload_hash, &prev_hash, &block_hash, alert).await {
            eprintln!("Error inserting block: {}", e);
        } else {
            println!("Inserted block {} | Temp: {:.1}°C | Alert: {}", index, temp, alert);
        }

        // Update previous hash and increment index
        prev_hash = block_hash;
        index += 1;

        // Wait 10 seconds before next reading
        sleep(Duration::from_secs(10)).await;
    }
}

/// Compute SHA256 hash for a string
fn compute_hash(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    format!("{:x}", hasher.finalize())
}
