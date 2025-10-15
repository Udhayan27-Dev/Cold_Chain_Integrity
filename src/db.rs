use sqlx::PgPool;
use crate::models::VaccineData;

pub async fn init_db_pool() -> Result<PgPool, sqlx::Error> {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgPool::connect(&database_url).await
}

pub async fn insert_block(
    pool: &PgPool,
    index: i64,
    data: &VaccineData,
    payload_hash: &str,
    prev_hash: &str,
    hash: &str,
    alert: bool,
) -> Result<(), sqlx::Error> {
    sqlx::query!(
        r#"
        INSERT INTO vaccine_blocks (index_num, batch_no, container_no, payload_hash, prev_hash, hash, alert)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        "#,
        index,
        data.batch_no,
        data.container_no,
        payload_hash,
        prev_hash,
        hash,
        alert
    )
    .execute(pool)
    .await?;
    Ok(())
}
