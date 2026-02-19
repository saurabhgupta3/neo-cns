/**
 * Phase-based ETA calculation
 * 
 * The ML model predicts travel time (pickup → delivery).
 * Total ETA includes processing phases before travel begins.
 * 
 * Status Flow: Pending → Confirmed → Picked Up → In Transit → Out for Delivery → Delivered
 */

// Extra time (in minutes) added per phase before actual travel
const PHASE_BUFFER = {
    "Pending": 45,           // Waiting for confirmation + courier assignment
    "Confirmed": 30,         // Courier being assigned + pickup scheduling
    "Picked Up": 15,         // Courier organizing + heading to route
    "In Transit": 5,         // Almost on final delivery leg
    "Out for Delivery": 0,   // Pure ML travel time
    "Delivered": 0,
    "Cancelled": 0
};

/**
 * Get adjusted ETA based on order status
 * @param {number} etaMinutes - Raw ML predicted travel time in minutes
 * @param {string} status - Current order status
 * @returns {object} - { totalMinutes, formatted, label }
 */
export function getAdjustedETA(etaMinutes, status) {
    if (!etaMinutes || status === "Delivered" || status === "Cancelled") {
        return null;
    }

    const buffer = PHASE_BUFFER[status] ?? 0;
    const totalMinutes = Math.round(etaMinutes + buffer);

    return {
        totalMinutes,
        formatted: formatETA(totalMinutes),
        label: getETALabel(status)
    };
}

/**
 * Format minutes into readable string
 * @param {number} minutes 
 * @returns {string}
 */
export function formatETA(minutes) {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

/**
 * Get contextual label for ETA based on status
 * @param {string} status 
 * @returns {string}
 */
function getETALabel(status) {
    const labels = {
        "Pending": "Est. total time",
        "Confirmed": "Est. remaining",
        "Picked Up": "Est. delivery in",
        "In Transit": "Arriving in",
        "Out for Delivery": "Arrives in"
    };
    return labels[status] || "ETA";
}
