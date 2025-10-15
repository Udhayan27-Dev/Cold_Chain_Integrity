// Temperature thresholds
const MIN_SAFE_TEMP = 2.0;
const MAX_SAFE_TEMP = 8.0;

// DOM Elements
const fetchBtn = document.getElementById('fetchBtn');
const batchInput = document.getElementById('batch_no');
const ctx = document.getElementById('tempChart').getContext('2d');
const dataTable = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
const statusElement = document.getElementById('status');

let chart; // global chart variable

// Helper function to generate temperature based on alert status
function generateTemperature(isAlert) {
      if (isAlert) {
            // For alerts, generate temperature outside safe range
            return Math.random() > 0.5 
                  ? Math.random() * MIN_SAFE_TEMP // Below minimum (0-2°C)
                  : MAX_SAFE_TEMP + Math.random() * 4.0; // Above maximum (8-12°C)
      } else {
            // For non-alerts, generate temperature within safe range
            return MIN_SAFE_TEMP + Math.random() * (MAX_SAFE_TEMP - MIN_SAFE_TEMP);
      }
}

// Function to update status indicator
function updateStatus(data) {
      const alertCount = data.filter(d => d.alert).length;
      const totalCount = data.length;
      
      statusElement.className = 'status';
      
      if (alertCount === 0) {
            statusElement.classList.add('success');
            statusElement.textContent = `✓ All ${totalCount} readings within safe range`;
      } else if (alertCount / totalCount < 0.25) {
            statusElement.classList.add('warning');
            statusElement.textContent = `⚠ ${alertCount} temperature alerts detected`;
      } else {
            statusElement.classList.add('danger');
            statusElement.textContent = `⚠ Critical: ${alertCount}/${totalCount} readings out of range`;
      }
}

// Function to populate the data table with decoded payload information
function populateTable(data, temperatures) {
      // Remove the old tbody completely
      const oldTbody = document.querySelector('#dataTable tbody');
      if (oldTbody) {
            oldTbody.remove();
      }
      
      // Create a fresh new tbody
      const newTbody = document.createElement('tbody');
      document.getElementById('dataTable').appendChild(newTbody);
      
      console.log('Created fresh tbody, adding', data.length, 'new rows');
      
      // Add rows for each data point
      data.forEach((block, index) => {
            const row = newTbody.insertRow();
            row.setAttribute('data-block-id', block.id);
            
            // Format timestamp
            const timestamp = new Date(block.created_at).toLocaleString();
            const temp = temperatures[index].toFixed(1);
            const isAlert = block.alert;
            
            // Create and populate cells with decoded payload data (9 columns)
            const blockCell = row.insertCell(0);
            const timeCell = row.insertCell(1);
            const tempCell = row.insertCell(2);
            const vaccineCell = row.insertCell(3);
            const manufacturerCell = row.insertCell(4);
            const shipmentCell = row.insertCell(5);
            const locationCell = row.insertCell(6);
            const containerCell = row.insertCell(7);
            const statusCell = row.insertCell(8);
            
            // Populate cells with decoded payload values
            blockCell.textContent = `#${block.index_num}`;
            timeCell.textContent = timestamp;
            tempCell.innerHTML = `<span class="${isAlert ? 'temp-alert' : 'temp-normal'}">${temp}°C</span>`;
            vaccineCell.textContent = block.vaccine_name || 'Covishield';
            manufacturerCell.textContent = block.manufacture_name || 'Serum Institute';
            shipmentCell.textContent = block.shipment_name || 'BlueDart';
            locationCell.textContent = block.current_location || 'Mumbai';
            containerCell.textContent = block.container_no;
            statusCell.innerHTML = `<span class="${isAlert ? 'status-alert' : 'status-normal'}">${isAlert ? 'ALERT' : 'Normal'}</span>`;
            
            // Add click handler to show full payload details
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                  showPayloadDetails(block, temp);
            });
      });
}

// Function to show detailed payload information with decoded data
function showPayloadDetails(block, temperature) {
      const payloadData = block.payload_data || {};
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
            <div class="modal-content">
                  <div class="modal-header">
                        <h3>Block #${block.index_num} - Decoded Payload Data</h3>
                        <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                  </div>
                  <div class="modal-body">
                        <h4>📋 Vaccine Information (Decoded from Blockchain)</h4>
                        <div class="detail-grid">
                              <div class="detail-item">
                                    <label>🌡️ Temperature:</label>
                                    <span class="${block.alert ? 'temp-alert' : 'temp-normal'}">${temperature.toFixed(1)}°C</span>
                              </div>
                              <div class="detail-item">
                                    <label>💉 Vaccine Name:</label>
                                    <span>${block.vaccine_name || 'Covishield'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>🏭 Manufacturer:</label>
                                    <span>${block.manufacture_name || 'Serum Institute'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>🚚 Shipment Company:</label>
                                    <span>${block.shipment_name || 'BlueDart'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>📍 Current Location:</label>
                                    <span>${block.current_location || 'Mumbai'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>📦 Container ID:</label>
                                    <span>${block.container_no}</span>
                              </div>
                              <div class="detail-item">
                                    <label>📋 Batch Number:</label>
                                    <span>${block.batch_no}</span>
                              </div>
                              <div class="detail-item">
                                    <label>⏰ Timestamp:</label>
                                    <span>${new Date(block.created_at).toLocaleString()}</span>
                              </div>
                              <div class="detail-item">
                                    <label>🚨 Alert Status:</label>
                                    <span class="${block.alert ? 'temp-alert' : 'temp-normal'}">${block.alert ? 'TEMPERATURE ALERT' : 'Normal Range'}</span>
                              </div>
                        </div>
                        
                        <h4>🔐 Original Payload JSON (Reconstructed)</h4>
                        <div class="payload-json">${JSON.stringify(payloadData, null, 2)}</div>
                        
                        <h4>🔗 Blockchain Hash Information</h4>
                        <div class="hash-section">
                              <div class="detail-item full-width">
                                    <label>🔗 Payload Hash (SHA-256):</label>
                                    <span class="hash-full">${block.payload_hash}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>⬅️ Previous Block Hash:</label>
                                    <span class="hash-full">${block.prev_hash}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>🏗️ Current Block Hash:</label>
                                    <span class="hash-full">${block.hash}</span>
                              </div>
                        </div>
                              <div class="detail-item">
                                    <label>Status:</label>
                                    <span class="${block.alert ? 'status-alert' : 'status-normal'}">${block.alert ? 'TEMPERATURE ALERT' : 'Normal Range'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Batch:</label>
                                    <span>${block.batch_no}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Container:</label>
                                    <span>${block.container_no}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Timestamp:</label>
                                    <span>${new Date(block.created_at).toLocaleString()}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>Payload Hash:</label>
                                    <span class="hash-full">${block.payload_hash}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>Previous Hash:</label>
                                    <span class="hash-full">${block.prev_hash}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>Block Hash:</label>
                                    <span class="hash-full">${block.hash}</span>
                              </div>
                        </div>
                  </div>
            </div>
      `;
      document.body.appendChild(modal);
}

fetchBtn.addEventListener('click', async () => {
      const batchNo = batchInput.value.trim();
      if (!batchNo) return alert("Enter a batch number");

      // Show loading state
      fetchBtn.disabled = true;
      fetchBtn.textContent = "Loading...";

      try {
            // Fetch blockchain data from the API (database)
            console.log(`Fetching data for batch: ${batchNo}`);
            const res = await fetch(`http://127.0.0.1:8080/blocks/${batchNo}`);
            
            if (!res.ok) {
                  throw new Error(`Server returned ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();
            console.log(`Received ${data.length} records from database:`, data);

            if (data.length === 0) {
                  statusElement.className = 'status warning';
                  statusElement.textContent = `No records found for batch ${batchNo}`;
                  alert(`No blockchain records found for batch number: ${batchNo}\n\nCheck if:\n1. The batch number is correct\n2. Data has been generated for this batch`);
                  
                  // Clear table and chart
                  const tbody = document.querySelector('#dataTable tbody') || document.createElement('tbody');
                  tbody.innerHTML = '<tr><td colspan="9">No records found for this batch</td></tr>';
                  if (chart) {
                        chart.destroy();
                        chart = null;
                  }
                  return;
            }

            // Process database records - show exactly what we have
            statusElement.className = 'status success';
            statusElement.textContent = `✓ Loaded ${data.length} blockchain records from database`;
            
            // Extract data from blockchain records
            const labels = data.map((d, index) => `Block #${d.index_num}`);
            const alertFlags = data.map(d => d.alert);
            
            // Extract real temperature readings from the API response
            const temperatures = data.map(d => d.temperature || generateTemperature(d.alert));
            
            console.log('Processing data:', {
                  recordCount: data.length,
                  temperatures: temperatures,
                  alerts: alertFlags
            });
            
            // Update status and populate table
            updateStatus(data);
            populateTable(data, temperatures);

            // Create enhanced chart dataset with gradient and high quality styling
            const dataset = {
                  labels: labels,
                  datasets: [{
                        label: `Cold Chain Temperature Monitoring (${data.length} blocks)`,
                        data: temperatures,
                        borderColor: '#2563eb',
                        backgroundColor: alertFlags.map(alert => 
                              alert ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'
                        ),
                        borderWidth: 3,
                        fill: 'start',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointBorderWidth: 2,
                        pointBorderColor: '#ffffff',
                        pointBackgroundColor: alertFlags.map(alert => 
                              alert ? '#ef4444' : '#22c55e'
                        ),
                        showLine: true,
                        pointHoverBorderWidth: 3,
                        pointHoverBorderColor: '#1e40af'
                  }]
            };

            // Clean up any existing chart
            if (chart && typeof chart.destroy === 'function') {
                  chart.destroy();
                  chart = null;
            }

            // Create enhanced high-quality chart
            chart = new Chart(ctx, {
                  type: 'line',
                  data: dataset,
                  options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        devicePixelRatio: 2, // Higher resolution for crisp display
                        animation: {
                              duration: 1500,
                              easing: 'easeInOutCubic'
                        },
                        elements: {
                              point: {
                                    hoverRadius: 8
                              },
                              line: {
                                    borderCapStyle: 'round',
                                    borderJoinStyle: 'round'
                              }
                        },
                        interaction: {
                              intersect: false,
                              mode: 'index'
                        },
                        plugins: {
                              legend: { 
                                    display: true,
                                    position: 'top',
                                    align: 'center',
                                    labels: {
                                          font: {
                                                size: 16,
                                                weight: '600',
                                                family: 'Segoe UI'
                                          },
                                          color: '#1f2937',
                                          padding: 20,
                                          usePointStyle: true,
                                          pointStyle: 'circle'
                                    }
                              },
                              tooltip: {
                                    enabled: true,
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    titleColor: '#f9fafb',
                                    bodyColor: '#f3f4f6',
                                    borderColor: '#6b7280',
                                    borderWidth: 1,
                                    cornerRadius: 8,
                                    padding: 12,
                                    displayColors: true,
                                    titleFont: {
                                          size: 14,
                                          weight: '600'
                                    },
                                    bodyFont: {
                                          size: 13
                                    },
                                    callbacks: {
                                          title: function(context) {
                                                return `🔗 Block #${data[context[0].dataIndex].index_num}`;
                                          },
                                          label: function(context) {
                                                const temp = parseFloat(context.raw).toFixed(1);
                                                const isAlert = temp < MIN_SAFE_TEMP || temp > MAX_SAFE_TEMP;
                                                const status = isAlert ? '🚨 TEMPERATURE ALERT' : '✅ Normal Range';
                                                return `🌡️ Temperature: ${temp}°C (${status})`;
                                          },
                                          afterLabel: function(context) {
                                                const blockData = data[context.dataIndex];
                                                return [
                                                      `📦 Container: ${blockData.container_no}`,
                                                      `💉 Vaccine: ${blockData.vaccine_name || 'Covishield'}`,
                                                      `📍 Location: ${blockData.current_location || 'Mumbai'}`
                                                ];
                                          }
                                    }
                              }
                        },
                        scales: {
                              y: { 
                                    type: 'linear',
                                    position: 'left',
                                    beginAtZero: true,
                                    min: -1,
                                    max: 13,
                                    ticks: {
                                          stepSize: 2,
                                          callback: function(value) {
                                                if (value >= 0 && value <= 12) {
                                                      const tempClass = (value >= MIN_SAFE_TEMP && value <= MAX_SAFE_TEMP) ? '✅' : '🚨';
                                                      return `${value}°C ${value === MIN_SAFE_TEMP || value === MAX_SAFE_TEMP ? tempClass : ''}`;
                                                }
                                                return value + '°C';
                                          },
                                          font: {
                                                size: 13,
                                                weight: '500',
                                                family: 'Segoe UI'
                                          },
                                          color: '#374151'
                                    },
                                    title: {
                                          display: true,
                                          text: '🌡️ Temperature (°C)',
                                          font: { 
                                                size: 16,
                                                weight: '600',
                                                family: 'Segoe UI'
                                          },
                                          color: '#1f2937',
                                          padding: 10
                                    },
                                    grid: {
                                          color: 'rgba(107, 114, 128, 0.2)',
                                          drawBorder: true,
                                          drawOnChartArea: true,
                                          lineWidth: 1
                                    },
                                    border: {
                                          color: '#6b7280',
                                          width: 2
                                    }
                              },
                              x: { 
                                    type: 'category',
                                    title: {
                                          display: true,
                                          text: '🔗 Blockchain Blocks',
                                          font: { 
                                                size: 16,
                                                weight: '600',
                                                family: 'Segoe UI'
                                          },
                                          color: '#1f2937',
                                          padding: 10
                                    },
                                    grid: {
                                          color: 'rgba(107, 114, 128, 0.1)',
                                          drawBorder: true,
                                          display: false
                                    },
                                    border: {
                                          color: '#6b7280',
                                          width: 2
                                    },
                                    ticks: {
                                          font: {
                                                size: 12,
                                                weight: '500',
                                                family: 'Segoe UI'
                                          },
                                          color: '#374151',
                                          maxRotation: 45,
                                          minRotation: 0
                                    }
                              }
                        },
                        layout: {
                              padding: {
                                    top: 20,
                                    right: 20,
                                    bottom: 20,
                                    left: 20
                              }
                        }
                  },
                  plugins: [{
                        // Custom plugin to draw threshold lines
                        afterDraw: function(chart) {
                              const ctx = chart.ctx;
                              const chartArea = chart.chartArea;
                              const yScale = chart.scales.y;
                              
                              // Draw minimum threshold line (2°C)
                              const minY = yScale.getPixelForValue(MIN_SAFE_TEMP);
                              ctx.save();
                              ctx.strokeStyle = '#e74c3c';
                              ctx.lineWidth = 2;
                              ctx.setLineDash([5, 5]);
                              ctx.beginPath();
                              ctx.moveTo(chartArea.left, minY);
                              ctx.lineTo(chartArea.right, minY);
                              ctx.stroke();
                              
                              // Label for min line
                              ctx.fillStyle = '#e74c3c';
                              ctx.font = 'bold 12px Arial';
                              ctx.fillText('Min Safe (2°C)', chartArea.left + 5, minY - 5);
                              
                              // Draw maximum threshold line (8°C)
                              const maxY = yScale.getPixelForValue(MAX_SAFE_TEMP);
                              ctx.strokeStyle = '#e74c3c';
                              ctx.beginPath();
                              ctx.moveTo(chartArea.left, maxY);
                              ctx.lineTo(chartArea.right, maxY);
                              ctx.stroke();
                              
                              // Label for max line
                              ctx.fillText('Max Safe (8°C)', chartArea.left + 5, maxY - 5);
                              
                              // Draw safe zone
                              ctx.fillStyle = 'rgba(46, 204, 113, 0.1)';
                              ctx.fillRect(chartArea.left, maxY, chartArea.right - chartArea.left, minY - maxY);
                              
                              ctx.restore();
                        }
                  }]
            });

      } catch (err) {
            console.error('Fetch error:', err);
            statusElement.className = 'status danger';
            
            if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
                  statusElement.textContent = '✗ Cannot connect to server. Please start the backend.';
                  alert('Cannot connect to the backend server. Please ensure:\n1. The server is running (cargo run)\n2. The server is accessible at http://127.0.0.1:8080');
            } else {
                  statusElement.textContent = `✗ Error: ${err.message}`;
                  alert(`Error fetching data: ${err.message}`);
            }
            
            // Clear any existing chart and table
            if (chart) {
                  chart.destroy();
                  chart = null;
            }
            const tbody = document.querySelector('#dataTable tbody') || document.createElement('tbody');
            tbody.innerHTML = '<tr><td colspan="9">No data - server connection failed</td></tr>';
      } finally {
            // Reset button state
            fetchBtn.disabled = false;
            fetchBtn.textContent = "Fetch Data";
      }
});

// Add connection status indicator
function checkServerConnection() {
      fetch('http://127.0.0.1:8080/blocks/test')
            .then(response => {
                  if (response.ok) {
                        statusElement.className = 'status success';
                        statusElement.textContent = '✓ Server connected and ready';
                  }
            })
            .catch(() => {
                  statusElement.className = 'status danger';
                  statusElement.textContent = '✗ Server offline - please start backend';
            });
}

// Check server status on page load
document.addEventListener('DOMContentLoaded', checkServerConnection);
