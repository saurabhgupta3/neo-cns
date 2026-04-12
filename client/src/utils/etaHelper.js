// phase-based ETA

// phase buffers
const PHASE_BUFFER = {
    Pending: 45,
    Confirmed: 30,
    "Picked Up": 15,
    "In Transit": 5,
    "Out for Delivery": 0,
    Delivered: 0,
    Cancelled: 0,
};

// get adjusted ETA
export function getAdjustedETA(etaMinutes, status) {
    if (!etaMinutes || status === "Delivered" || status === "Cancelled") {
        return null;
    }

    const buffer = PHASE_BUFFER[status] ?? 0;
    const totalMinutes = Math.round(etaMinutes + buffer);

    return {
        totalMinutes,
        formatted: formatETA(totalMinutes),
        label: getETALabel(status),
    };
}

// format time
export function formatETA(minutes) {
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
}

// status label
function getETALabel(status) {
    const labels = {
        Pending: "Est. total time",
        Confirmed: "Est. remaining",
        "Picked Up": "Est. delivery in",
        "In Transit": "Arriving in",
        "Out for Delivery": "Arrives in",
    };
    return labels[status] || "ETA";
}
