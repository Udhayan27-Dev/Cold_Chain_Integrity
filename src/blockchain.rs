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

    // Check for existing blocks and continue from where we left off
    let (mut prev_hash, mut index) = match get_last_block(&pool, &fixed_batch).await {
        Ok(Some((last_index, last_hash))) => {
            println!("Resuming blockchain from block {} with hash: {}", last_index + 1, &last_hash[..16]);
            (last_hash, last_index + 1)
        },
        Ok(None) => {
            println!("Starting new blockchain from genesis block");
            ("0".to_string(), 1)
        },
        Err(e) => {
            eprintln!("Error checking existing blocks: {}", e);
            println!("Starting new blockchain from genesis block");
            ("0".to_string(), 1)
        }
    };

    // Create a thread-safe random number generator with seed based on current index
    let mut rng = StdRng::seed_from_u64(42 + index as u64); // Using index-based seed for continuity
    // Wider temperature range to simulate both low and high temperature excursions
    let low_temp = 0.0;
    let high_temp = 12.0;
    
    // Clean up any duplicate blocks that might exist
    if let Err(e) = cleanup_duplicate_blocks(&pool, &fixed_batch).await {
        eprintln!("Warning: Could not clean up duplicate blocks: {}", e);
    }

    println!("Starting temperature monitoring for batch: {}", fixed_batch);

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

        // Check if block already exists before inserting
        match check_block_exists(&pool, index, &fixed_batch).await {
            Ok(true) => {
                println!("Block {} already exists, skipping insertion", index);
            },
            Ok(false) => {
                // Insert block into PostgreSQL
                if let Err(e) = db::insert_block(&pool, index, &data, &payload_hash, &prev_hash, &block_hash, alert).await {
                    eprintln!("Error inserting block: {}", e);
                } else {
                    println!("Inserted block {} | Temp: {:.1}°C | Alert: {}", index, temp, alert);
                }
            },
            Err(e) => {
                eprintln!("Error checking block existence: {}", e);
            }
        }

        // Update previous hash and increment index
        prev_hash = block_hash;
        index += 1;

        // Wait 10 seconds before next reading
        sleep(Duration::from_secs(10)).await;
    }
}

/// Get the last block from the database for a specific batch
async fn get_last_block(pool: &PgPool, batch_no: &str) -> Result<Option<(i64, String)>, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        SELECT index_num, hash
        FROM vaccine_blocks 
        WHERE batch_no = $1 
        ORDER BY index_num DESC 
        LIMIT 1
        "#,
        batch_no
    )
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|row| (row.index_num, row.hash)))
}

/// Check if a block with the given index and batch already exists
async fn check_block_exists(pool: &PgPool, index: i64, batch_no: &str) -> Result<bool, sqlx::Error> {
    let result = sqlx::query!(
        r#"
        SELECT COUNT(*) as count
        FROM vaccine_blocks 
        WHERE index_num = $1 AND batch_no = $2
        "#,
        index,
        batch_no
    )
    .fetch_one(pool)
    .await?;

    Ok(result.count.unwrap_or(0) > 0)
}

/// Clean up duplicate blocks keeping only the first occurrence of each index
async fn cleanup_duplicate_blocks(pool: &PgPool, batch_no: &str) -> Result<(), sqlx::Error> {
    let deleted_count = sqlx::query!(
        r#"
        DELETE FROM vaccine_blocks 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM vaccine_blocks 
            WHERE batch_no = $1 
            GROUP BY index_num
        ) AND batch_no = $1
        "#,
        batch_no
    )
    .execute(pool)
    .await?
    .rows_affected();

    if deleted_count > 0 {
        println!("Cleaned up {} duplicate blocks for batch: {}", deleted_count, batch_no);
    }

    Ok(())
}

/// Compute SHA256 hash for a string
fn compute_hash(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    format!("{:x}", hasher.finalize())
}
