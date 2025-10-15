// Temperature thresholds
const MIN_SAFE_TEMP = 2.0;
const MAX_SAFE_TEMP = 8.0;

// DOM Elements
const fetchBtn = document.getElementById('fetchBtn');
const batchInput = document.getElementById('batch_no');
const ctx = document.getElementById('tempChart').getContext('2d');
const statusElement = document.getElementById('status');

let chart; // global chart variable
let autoRefreshInterval; // auto-refresh timer
let isAutoRefreshEnabled = false;
let lastDataLength = 0; // track data length for detecting new blocks

// Helper function to generate temperature based on alert status
function generateTemperature(isAlert) {
      if (isAlert) {
            return Math.random() > 0.5 
                  ? Math.random() * MIN_SAFE_TEMP 
                  : MAX_SAFE_TEMP + Math.random() * 4.0;
      } else {
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
            statusElement.textContent = `SUCCESS: All ${totalCount} readings within safe range`;
      } else if (alertCount / totalCount < 0.25) {
            statusElement.classList.add('warning');
            statusElement.textContent = `WARNING: ${alertCount} temperature alerts detected`;
      } else {
            statusElement.classList.add('danger');
            statusElement.textContent = `CRITICAL: ${alertCount}/${totalCount} readings out of range`;
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
            const tempValue = parseFloat(temp);
            const isAlert = tempValue < MIN_SAFE_TEMP || tempValue > MAX_SAFE_TEMP;
            
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
      const tempValue = parseFloat(temperature);
      const isTemperatureAlert = tempValue < MIN_SAFE_TEMP || tempValue > MAX_SAFE_TEMP;
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
            <div class="modal-content">
                  <div class="modal-header">
                        <h3>Block #${block.index_num} - Decoded Payload Data</h3>
                        <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                  </div>
                  <div class="modal-body">
                        <h4>Vaccine Information (Decoded from Blockchain)</h4>
                        <div class="detail-grid">
                              <div class="detail-item">
                                    <label>Temperature:</label>
                                    <span class="${isTemperatureAlert ? 'temp-alert' : 'temp-normal'}">${temperature.toFixed(1)}°C</span>
                              </div>
                              <div class="detail-item">
                                    <label>Vaccine Name:</label>
                                    <span>${block.vaccine_name || 'Covishield'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Manufacturer:</label>
                                    <span>${block.manufacture_name || 'Serum Institute'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Shipment Company:</label>
                                    <span>${block.shipment_name || 'BlueDart'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Current Location:</label>
                                    <span>${block.current_location || 'Mumbai'}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Container ID:</label>
                                    <span>${block.container_no}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Batch Number:</label>
                                    <span>${block.batch_no}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Timestamp:</label>
                                    <span>${new Date(block.created_at).toLocaleString()}</span>
                              </div>
                              <div class="detail-item">
                                    <label>Alert Status:</label>
                                    <span class="${isTemperatureAlert ? 'temp-alert' : 'temp-normal'}">${isTemperatureAlert ? 'TEMPERATURE ALERT' : 'Normal Range'}</span>
                              </div>
                        </div>
                        
                        <h4>Original Payload JSON (Reconstructed)</h4>
                        <div class="payload-json">${JSON.stringify(payloadData, null, 2)}</div>
                        
                        <h4>Blockchain Hash Information</h4>
                        <div class="hash-section">
                              <div class="detail-item full-width">
                                    <label>Payload Hash (SHA-256):</label>
                                    <span class="hash-full">${block.payload_hash}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>Previous Block Hash:</label>
                                    <span class="hash-full">${block.prev_hash}</span>
                              </div>
                              <div class="detail-item full-width">
                                    <label>Current Block Hash:</label>
                                    <span class="hash-full">${block.hash}</span>
                              </div>
                        </div>
                  </div>
            </div>
      `;
      document.body.appendChild(modal);
}

// Function to fetch and update data dynamically
async function fetchAndUpdateData(batchNo, showLoading = false) {
      try {
            if (showLoading) {
                  fetchBtn.disabled = true;
                  fetchBtn.textContent = "Loading...";
            }

            console.log(`Fetching data for batch: ${batchNo}`);
            const res = await fetch(`http://127.0.0.1:8080/blocks/${batchNo}`);
            
            if (!res.ok) {
                  throw new Error(`Server returned ${res.status}: ${res.statusText}`);
            }
            
            const data = await res.json();

            if (data.length === 0) {
                  statusElement.className = 'status warning';
                  statusElement.textContent = `No records found for batch ${batchNo}`;
                  
                  const tbody = document.querySelector('#dataTable tbody') || document.createElement('tbody');
                  tbody.innerHTML = '<tr><td colspan="9">No records found for this batch</td></tr>';
                  if (chart) {
                        chart.destroy();
                        chart = null;
                  }
                  return false;
            }

            // Check if new data has arrived
            const isNewData = data.length !== lastDataLength;
            lastDataLength = data.length;

            if (isNewData || showLoading) {
                  console.log(`New blockchain data: ${data.length} blocks (was ${lastDataLength})`);
                  
                  // Process database records
                  statusElement.className = 'status success';
                  const refreshStatus = isAutoRefreshEnabled ? 'LIVE' : 'PAUSED';
                  statusElement.textContent = `${refreshStatus}: ${data.length} blocks loaded (Auto-refresh every 10s)`;
                  
                  // Extract data from blockchain records
                  const labels = data.map((d) => `Block #${d.index_num}`);
                  const alertFlags = data.map(d => d.alert);
                  const temperatures = data.map(d => d.temperature || generateTemperature(d.alert));
                  
                  // Update status and populate table
                  updateStatus(data);
                  populateTable(data, temperatures);

                  // Update or create chart
                  updateChart(labels, temperatures, alertFlags, data);
            }

            return true;

      } catch (err) {
            console.error('Fetch error:', err);
            statusElement.className = 'status danger';
            
            if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
                  statusElement.textContent = 'ERROR: Server offline. Auto-refresh paused.';
            } else {
                  statusElement.textContent = `ERROR: ${err.message}`;
            }
            
            return false;
      } finally {
            if (showLoading) {
                  fetchBtn.disabled = false;
                  updateButtonState();
            }
      }
}

// Function to update button state
function updateButtonState() {
      if (isAutoRefreshEnabled) {
            fetchBtn.textContent = "Stop Auto-Refresh";
            fetchBtn.style.backgroundColor = "#e74c3c";
      } else {
            fetchBtn.textContent = "Start Auto-Refresh";
            fetchBtn.style.backgroundColor = "#3498db";
      }
}

// Function to update or create chart dynamically
function updateChart(labels, temperatures, alertFlags, data) {
      const dataset = {
            labels: labels,
            datasets: [{
                  label: `Live Blockchain Data (${data.length} blocks)`,
                  data: temperatures,
                  borderColor: '#2563eb',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  borderWidth: 3,
                  fill: 'start',
                  tension: 0.4,
                  pointRadius: 6,
                  pointHoverRadius: 8,
                  pointBorderWidth: 2,
                  pointBorderColor: '#ffffff',
                  pointBackgroundColor: temperatures.map(temp => {
                        if (temp === MIN_SAFE_TEMP || temp === MAX_SAFE_TEMP) {
                              return '#2563eb'; // Blue for boundary temperatures (2°C or 8°C)
                        } else if (temp > MIN_SAFE_TEMP && temp < MAX_SAFE_TEMP) {
                              return '#22c55e'; // Green for safe range (between 2°C and 8°C)
                        } else {
                              return '#ef4444'; // Red for alerts (outside safe range)
                        }
                  }),
                  showLine: true,
                  pointHoverBorderWidth: 3,
                  pointHoverBorderColor: '#1e40af'
            }, {
                  label: ``,
                  data: new Array(temperatures.length).fill(MIN_SAFE_TEMP),
                  borderColor: '#ef4444',
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  pointRadius: 0,
                  pointHoverRadius: 0,
                  showLine: true,
                  fill: false,
                  tension: 0
            }, {
                  label: ``,
                  data: new Array(temperatures.length).fill(MAX_SAFE_TEMP),
                  borderColor: '#22c55e',
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  pointRadius: 0,
                  pointHoverRadius: 0,
                  showLine: true,
                  fill: false,
                  tension: 0
            }]
      };

      // If chart exists, update data smoothly
      if (chart && chart.data) {
            chart.data.labels = labels;
            chart.data.datasets[0].data = temperatures;
            chart.data.datasets[0].pointBackgroundColor = temperatures.map(temp => {
                  if (temp === MIN_SAFE_TEMP || temp === MAX_SAFE_TEMP) {
                        return '#2563eb'; // Blue for boundary temperatures (2°C or 8°C)
                  } else if (temp > MIN_SAFE_TEMP && temp < MAX_SAFE_TEMP) {
                        return '#22c55e'; // Green for safe range (between 2°C and 8°C)
                  } else {
                        return '#ef4444'; // Red for alerts (outside safe range)
                  }
            });
            chart.data.datasets[0].label = `Live Blockchain Data (${data.length} blocks)`;
            
            // Update min/max temperature reference lines
            chart.data.datasets[1].data = new Array(temperatures.length).fill(MIN_SAFE_TEMP);
            chart.data.datasets[2].data = new Array(temperatures.length).fill(MAX_SAFE_TEMP);
            
            chart.update('none'); // Update without animation for real-time feel
            console.log('Chart updated with new data including temperature thresholds');
      } else {
            // Create new chart
            createNewChart(dataset, data);
      }
}

// Function to create a new chart
function createNewChart(dataset, data) {
      // Clean up any existing chart
      if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
            chart = null;
      }

      chart = new Chart(ctx, {
            type: 'line',
            data: dataset,
            options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  devicePixelRatio: 2,
                  animation: { duration: 1000, easing: 'easeInOutCubic' },
                  elements: {
                        point: { hoverRadius: 8 },
                        line: { borderCapStyle: 'round', borderJoinStyle: 'round' }
                  },
                  interaction: { intersect: false, mode: 'index' },
                  plugins: {
                        legend: { 
                              display: true,
                              position: 'top',
                              labels: {
                                    font: { size: 16, weight: '600', family: 'Segoe UI' },
                                    color: '#1f2937',
                                    padding: 20,
                                    usePointStyle: true
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
                              callbacks: {
                                    title: function(context) {
                                          return `Block #${data[context[0].dataIndex].index_num}`;
                                    },
                                    label: function(context) {
                                          const temp = parseFloat(context.raw).toFixed(1);
                                          const isAlert = temp < MIN_SAFE_TEMP || temp > MAX_SAFE_TEMP;
                                          const status = isAlert ? 'ALERT' : 'Normal';
                                          return `Temperature: ${temp}°C (${status})`;
                                    },
                                    afterLabel: function(context) {
                                          const blockData = data[context.dataIndex];
                                          return [
                                                `Container: ${blockData.container_no}`,
                                                `Vaccine: ${blockData.vaccine_name || 'Covishield'}`,
                                                `Location: ${blockData.current_location || 'Mumbai'}`
                                          ];
                                    }
                              }
                        }
                  },
                  scales: {
                        y: { 
                              type: 'linear',
                              beginAtZero: false,
                              min: -2,
                              max: 12,
                              ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                          if (value >= -2 && value <= 12) {
                                                const indicator = (value >= MIN_SAFE_TEMP && value <= MAX_SAFE_TEMP) ? 'SAFE' : 'ALERT';
                                                return `${value}°C ${value === MIN_SAFE_TEMP || value === MAX_SAFE_TEMP ? `(${indicator})` : ''}`;
                                          }
                                          return '';
                                    }
                              },
                              title: { display: true, text: 'Temperature (°C)' }
                        },
                        x: { 
                              title: { display: true, text: 'Blockchain Blocks' }
                        }
                  },
                  layout: { padding: 20 }
            }
      });
      console.log('New chart created');
}

// Function to toggle auto-refresh
function toggleAutoRefresh() {
      const batchNo = batchInput.value.trim();
      if (!batchNo) {
            alert("Please enter a batch number first");
            return;
      }

      if (isAutoRefreshEnabled) {
            // Stop auto-refresh
            clearInterval(autoRefreshInterval);
            isAutoRefreshEnabled = false;
            updateButtonState();
            statusElement.textContent = `SUCCESS: Auto-refresh stopped. ${lastDataLength} blocks loaded.`;
            console.log('Auto-refresh stopped');
      } else {
            // Start auto-refresh
            isAutoRefreshEnabled = true;
            updateButtonState();
            
            // Initial fetch
            fetchAndUpdateData(batchNo, true);
            
            // Set up auto-refresh every 10 seconds
            autoRefreshInterval = setInterval(() => {
                  fetchAndUpdateData(batchNo, false);
            }, 10000); // 10 seconds
            
            console.log('Auto-refresh started (every 10 seconds)');
      }
}

// Event listeners
fetchBtn.addEventListener('click', toggleAutoRefresh);

// Add connection status indicator
function checkServerConnection() {
      fetch('http://127.0.0.1:8080/blocks/test')
            .then(response => {
                  if (response.ok) {
                        statusElement.className = 'status success';
                        statusElement.textContent = 'SUCCESS: Server connected and ready';
                  }
            })
            .catch(() => {
                  statusElement.className = 'status danger';
                  statusElement.textContent = 'ERROR: Server offline - please start backend';
            });
}

// Check server status on page load
document.addEventListener('DOMContentLoaded', () => {
      checkServerConnection();
      updateButtonState();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
      if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
      }
});