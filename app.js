// Get canvas context
const canvas = document.getElementById('stereonetCanvas');
const ctx = canvas.getContext('2d');
const infoBox = document.getElementById('stationInfo');

const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;
const radius = (Math.min(width, height) / 2) - 20;

// Data structure to hold plotted points for interaction
const plottedPoints = [];

// Convert Azimuth and Take-off angle to canvas X, Y coordinates
function getCoordinates(az, toa) {
    let effectiveAz = az;
    let alpha = toa; // angle from downward vertical (0 to 90)
    
    // If ray goes upwards (TOA > 90), project it through center to lower hemisphere
    if (toa > 90) {
        effectiveAz = (az + 180) % 360;
        alpha = 180 - toa;
    }

    // Ensure alpha is in radians
    const alphaRad = alpha * Math.PI / 180;
    
    // Equal-area projection formula: r = R * sqrt(2) * sin(alpha / 2)
    const r = radius * Math.sqrt(2) * Math.sin(alphaRad / 2);
    
    // Convert azimuth to math angle (0 is North/up, clockwise)
    const azRad = effectiveAz * Math.PI / 180;
    
    const x = centerX + r * Math.sin(azRad);
    const y = centerY - r * Math.cos(azRad);
    
    return { x, y, effectiveAz, effectiveAlpha: alpha };
}

function drawStereonet() {
    ctx.clearRect(0, 0, width, height);
    
    // Draw outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius - 10);
    ctx.lineTo(centerX, centerY + radius + 10);
    ctx.moveTo(centerX - radius - 10, centerY);
    ctx.lineTo(centerX + radius + 10, centerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    // Draw cardinal directions
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', centerX, centerY - radius - 12);
    ctx.fillText('S', centerX, centerY + radius + 12);
    ctx.fillText('E', centerX + radius + 12, centerY);
    ctx.fillText('W', centerX - radius - 12, centerY);

    // Draw reference circles (30 deg, 60 deg)
    [30, 60].forEach(deg => {
        const rad = deg * Math.PI / 180;
        const r = radius * Math.sqrt(2) * Math.sin(rad / 2);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
    });
    ctx.setLineDash([]);
}

function plotStations() {
    plottedPoints.length = 0; // Clear
    
    // Assumes 'stations' is loaded from data.js
    if (typeof stations === 'undefined') return;

    stations.forEach(st => {
        const coords = getCoordinates(st.azimuth, st.toa);
        
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, 5, 0, 2 * Math.PI);
        
        if (st.polarity === '+') {
            ctx.fillStyle = '#ef4444'; // Red for compression
            ctx.fill();
        } else {
            ctx.strokeStyle = '#3b82f6'; // Blue for dilatation
            ctx.lineWidth = 2;
            ctx.stroke();
            // Optional: fill with background color to make it truly hollow
            ctx.fillStyle = '#0f172a';
            ctx.fill();
        }

        plottedPoints.push({
            ...st,
            ...coords,
            radius: 5
        });
    });
}

function init() {
    drawStereonet();
    plotStations();
}

// Interactivity: Hover to show station info
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let hovered = null;

    for (let pt of plottedPoints) {
        const dx = mouseX - pt.x;
        const dy = mouseY - pt.y;
        if (dx*dx + dy*dy <= pt.radius * pt.radius * 4) { // Hitbox slightly larger
            hovered = pt;
            break;
        }
    }

    if (hovered) {
        canvas.style.cursor = 'pointer';
        const polarityStr = hovered.polarity === '+' ? '壓縮 (Up, +)' : '膨脹 (Down, -)';
        let projStr = '';
        if (hovered.toa > 90) {
            projStr = `<br><span style="color:var(--text-secondary);font-size:0.9em;">(反向投影: Az'=${hovered.effectiveAz}°, TOA'=${hovered.effectiveAlpha}°)</span>`;
        }

        infoBox.innerHTML = `
            <div>
                測站: <span class="info-value">${hovered.station}</span>
            </div>
            <div>
                方位角 (Azimuth): <span class="info-value">${hovered.azimuth}°</span>
            </div>
            <div>
                射出角 (TOA): <span class="info-value">${hovered.toa}°</span>
            </div>
            <div>
                極性: <span class="info-value" style="color: ${hovered.polarity === '+' ? 'var(--compression)' : 'var(--dilatation)'}">${polarityStr}</span>
            </div>
            ${projStr}
        `;
        
        // Highlight logic
        drawStereonet();
        plotStations();
        
        // Draw highlight circle
        ctx.beginPath();
        ctx.arc(hovered.x, hovered.y, 8, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.stroke();

    } else {
        canvas.style.cursor = 'crosshair';
        infoBox.innerHTML = '<p>將滑鼠游標移至測站點以查看詳細資訊</p>';
        drawStereonet();
        plotStations();
    }
});

// Run
init();
