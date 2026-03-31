/**
 * Distance Calculation Service
 * 
 * Priority:
 * 1. OpenRouteService API (real road distance with geocoding)
 * 2. Haversine Formula (if geocoding works but routing fails)
 * 3. Error if geocoding fails
 */

const axios = require('axios');

// OpenRouteService API Key (free tier - 2000 requests/day)
const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = 'https://api.openrouteservice.org';

/**
 * Calculate distance using OpenRouteService API
 * Returns road distance in kilometers
 */
async function getDistanceFromORS(pickupCoords, deliveryCoords) {
    try {
        if (!ORS_API_KEY) {
            throw new Error('ORS_API_KEY not configured');
        }

        const response = await axios.post(
            `${ORS_BASE_URL}/v2/directions/driving-car`,
            {
                coordinates: [
                    [pickupCoords.lng, pickupCoords.lat],
                    [deliveryCoords.lng, deliveryCoords.lat]
                ]
            },
            {
                headers: {
                    'Authorization': ORS_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        // Distance is returned in meters, convert to km
        const distanceInMeters = response.data.routes[0].summary.distance;
        const distanceInKm = distanceInMeters / 1000;
        
        console.log(`📍 ORS Distance: ${distanceInKm.toFixed(2)} km`);
        return distanceInKm;

    } catch (error) {
        console.log(`⚠️ ORS Routing API failed: ${error.message}`);
        throw error;
    }
}

/**
 * Known Indian cities/regions and their state abbreviations for geographic validation.
 * Used to verify that geocoded results are in the correct geographic area.
 */
const INDIAN_LOCATION_KEYWORDS = [
    'delhi', 'new delhi', 'mumbai', 'bangalore', 'bengaluru', 'chennai', 'kolkata',
    'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kanpur',
    'noida', 'greater noida', 'gurgaon', 'gurugram', 'faridabad',
    'ghaziabad', 'chandigarh', 'bhopal', 'indore', 'patna', 'nagpur',
    'vadodara', 'surat', 'visakhapatnam', 'coimbatore', 'kochi',
    'thiruvananthapuram', 'mysore', 'mysuru', 'agra', 'varanasi',
    'allahabad', 'prayagraj', 'meerut', 'mathura', 'amritsar',
    'jodhpur', 'udaipur', 'dehradun', 'haridwar', 'rishikesh',
    'shimla', 'manali', 'srinagar', 'jammu', 'ranchi', 'raipur',
    'bhubaneswar', 'guwahati', 'imphal', 'gangtok', 'kohima',
    'uttar pradesh', 'maharashtra', 'karnataka', 'tamil nadu',
    'west bengal', 'telangana', 'rajasthan', 'gujarat', 'madhya pradesh',
    'kerala', 'andhra pradesh', 'punjab', 'haryana', 'bihar',
    'jharkhand', 'uttarakhand', 'himachal pradesh', 'goa',
    'odisha', 'chhattisgarh', 'assam', 'tripura', 'meghalaya',
    'manipur', 'mizoram', 'nagaland', 'sikkim', 'arunachal pradesh'
];

/**
 * State abbreviation mapping for cross-validation
 */
const STATE_ABBREVIATIONS = {
    'up': 'uttar pradesh',
    'mp': 'madhya pradesh',
    'hp': 'himachal pradesh',
    'ap': 'andhra pradesh',
    'wb': 'west bengal',
    'tn': 'tamil nadu',
    'gj': 'gujarat',
    'rj': 'rajasthan',
    'mh': 'maharashtra',
    'ka': 'karnataka',
    'kl': 'kerala',
    'dl': 'delhi',
    'hr': 'haryana',
    'pb': 'punjab',
    'jk': 'jammu and kashmir',
    'uk': 'uttarakhand',
    'br': 'bihar',
    'jh': 'jharkhand',
    'or': 'odisha',
    'ct': 'chhattisgarh',
    'as': 'assam',
    'ga': 'goa',
    'ts': 'telangana'
};

/**
 * Extract geographic keywords (city/state names) from an address string.
 * These are used to verify if a geocoded result is in the correct area.
 */
function extractLocationKeywords(address) {
    const normalized = address.toLowerCase();
    const found = [];

    for (const keyword of INDIAN_LOCATION_KEYWORDS) {
        if (normalized.includes(keyword)) {
            found.push(keyword);
        }
    }

    return found;
}

/**
 * Expand state abbreviations in a result label for comparison.
 * e.g., "GJ, India" → includes "gujarat"
 */
function expandResultLabel(label) {
    let expanded = label.toLowerCase();
    for (const [abbr, full] of Object.entries(STATE_ABBREVIATIONS)) {
        const abbrPattern = new RegExp(`\\b${abbr}\\b`, 'gi');
        if (abbrPattern.test(expanded)) {
            expanded += ` ${full}`;
        }
    }
    return expanded;
}

/**
 * Extract the trailing geographic segments from an address.
 * The last few comma-separated parts (typically city, district, state)
 * are the most important for geographic validation.
 *
 * Example: "shahijan khurd, shahijan kalan, robberts gunj, sonbhadra"
 *   → ["sonbhadra", "robberts gunj"]
 */
function extractAddressSegments(address) {
    const parts = address.split(',').map(p => p.trim().toLowerCase()).filter(p => p.length > 2);

    if (parts.length === 0) return [];

    // Take the last 3 segments (or all if fewer than 3)
    // These are typically: area/locality, city/district, state
    const trailingParts = parts.slice(-Math.min(3, parts.length));

    // Clean each segment: remove PIN codes, numbers, common noise words
    const cleaned = trailingParts.map(part => {
        return part
            .replace(/[-–]?\s*\d{6}/, '')     // Remove PIN codes
            .replace(/\b(india|bharat)\b/gi, '') // Remove country name
            .replace(/\b(district|dist|tehsil|block|phase|sector)\b/gi, '') // Remove admin labels
            .replace(/^\s*\d+\s*$/, '')         // Remove pure numbers
            .trim();
    }).filter(p => p.length > 2); // Only keep segments with meaningful length

    return cleaned;
}

/**
 * Validate if a geocoded result matches the geographic context of the input address.
 * 
 * Uses TWO strategies:
 * 1. Segment-based: checks if trailing address segments (city/district/state) 
 *    from the input appear in the geocoded result
 * 2. Keyword-based: checks known Indian city/state names (existing approach)
 * 
 * If EITHER strategy finds a match, the result is considered valid.
 * If NEITHER finds a match, the result is rejected.
 */
function validateGeocodeResult(inputAddress, resultLabel) {
    const expandedResult = expandResultLabel(resultLabel);

    // Strategy 1: Segment-based validation
    // Check if trailing address segments appear in the result
    const segments = extractAddressSegments(inputAddress);
    const segmentMatch = segments.some(segment => expandedResult.includes(segment));

    if (segmentMatch) {
        return true;
    }

    // Strategy 2: Known keyword validation (hardcoded city/state list)
    const inputKeywords = extractLocationKeywords(inputAddress);
    if (inputKeywords.length > 0) {
        const keywordMatch = inputKeywords.some(keyword => expandedResult.includes(keyword));
        if (keywordMatch) {
            return true;
        }
    }

    // Neither strategy found a match
    if (segments.length > 0 || inputKeywords.length > 0) {
        console.log(`❌ Geographic validation failed:`);
        console.log(`   Input segments: [${segments.join(', ')}]`);
        console.log(`   Input keywords: [${inputKeywords.join(', ')}]`);
        console.log(`   Result label: "${resultLabel}"`);
        console.log(`   No matching geographic terms found in result.`);
        return false;
    }

    // No validation possible (very short/vague address) — accept with warning
    console.log(`⚠️ Cannot validate geocode result (no extractable segments or keywords)`);
    return true;
}

/**
 * Geocode an address using Nominatim (OpenStreetMap).
 * Nominatim is better at finding specific places, institutions, and addresses in India.
 */
async function geocodeWithNominatim(address) {
    const response = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        {
            params: {
                q: address,
                format: 'json',
                limit: 5,
                countrycodes: 'in',
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'Neo-CNS-CourierApp/1.0'
            },
            timeout: 10000
        }
    );

    if (!response.data || response.data.length === 0) {
        return null;
    }

    for (const result of response.data) {
        const candidate = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            placeName: result.display_name,
            importance: result.importance || 0
        };

        if (validateGeocodeResult(address, candidate.placeName)) {
            return candidate;
        }
        console.log(`   ⏭️ Skipping Nominatim result: "${result.display_name}" (geographic mismatch)`);
    }

    return null;
}

/**
 * Geocode an address using OpenRouteService (Pelias) as fallback.
 * Fallback match types are accepted if they pass geographic validation.
 */
async function geocodeWithORS(address) {
    if (!ORS_API_KEY) {
        return null;
    }

    const response = await axios.get(
        `${ORS_BASE_URL}/geocode/search`,
        {
            params: {
                api_key: ORS_API_KEY,
                text: address,
                'boundary.country': 'IN',
                size: 5
            },
            timeout: 10000
        }
    );

    if (!response.data.features || response.data.features.length === 0) {
        return null;
    }

    for (const feature of response.data.features) {
        const [lng, lat] = feature.geometry.coordinates;
        const label = feature.properties.label || 'Unknown';
        const matchType = feature.properties.match_type || 'unknown';

        const candidate = { lat, lng, placeName: label };

        if (validateGeocodeResult(address, candidate.placeName)) {
            if (matchType === 'fallback') {
                console.log(`   ℹ️ Using ORS approximate match: "${label}" (fallback, but geographically correct)`);
            }
            return candidate;
        }
        console.log(`   ⏭️ Skipping ORS result: "${label}" (geographic mismatch)`);
    }

    return null;
}

/**
 * Simplify a complex address by removing institution names, building numbers,
 * PIN codes, and other specific details that geocoding APIs often can't process.
 * Keeps area, city, state, and country information.
 *
 * Example:
 *   "Galgotias College Of Engineering, 1, Knowledge Park Phase II, Greater Noida, UP - 201306, India"
 *   → "Knowledge Park Phase II, Greater Noida, Uttar Pradesh, India"
 */
function simplifyAddress(address) {
    let simplified = address;

    // Remove PIN codes (6-digit, with or without dash/space prefix)
    simplified = simplified.replace(/[-–\s]*\d{6}/g, '');

    // Remove building/plot numbers like "1," or "Plot No. 2," or "No. 5,"
    simplified = simplified.replace(/\b(plot\s*no\.?\s*)?\d+\s*,/gi, '');

    // Remove common institution prefixes (college, university, institute, school, etc.)
    // This removes the first segment if it looks like an institution name
    const institutionPattern = /^[^,]*\b(college|university|institute|school|academy|hospital|centre|center|campus|polytechnic|iit|nit|iiit|bits|govt|government)\b[^,]*,\s*/i;
    simplified = simplified.replace(institutionPattern, '');

    // Remove "Phase" or "Sector" numbering patterns at the start if still too complex
    // Keep these as they help with geocoding

    // Clean up extra commas, spaces
    simplified = simplified.replace(/,\s*,/g, ',').replace(/^\s*,\s*/, '').replace(/\s+/g, ' ').trim();

    return simplified;
}

/**
 * Main geocoding function — tries multiple providers with geographic validation.
 * 
 * Strategy:
 * 1. Try Nominatim (OpenStreetMap) first — best for specific places in India
 * 2. Try ORS — with geographic validation (fallback matches accepted if geo-valid)
 * 3. Simplify address (remove institution name, PIN, etc.) and retry both providers
 * 4. If all fail, throw descriptive error
 */
async function geocodeAddress(address) {
    console.log(`\n🔍 Geocoding: "${address}"`);

    // Step 1: Try Nominatim with full address
    try {
        const nominatimResult = await geocodeWithNominatim(address);
        if (nominatimResult) {
            console.log(`✅ Geocoded via Nominatim: "${address}"`);
            console.log(`   → ${nominatimResult.placeName}`);
            console.log(`   📍 (${nominatimResult.lat.toFixed(4)}, ${nominatimResult.lng.toFixed(4)})`);
            return nominatimResult;
        }
        console.log(`⚠️ Nominatim: no valid result for full address`);
    } catch (error) {
        console.log(`⚠️ Nominatim geocoding failed: ${error.message}`);
    }

    // Step 2: Try ORS with full address
    try {
        const orsResult = await geocodeWithORS(address);
        if (orsResult) {
            console.log(`✅ Geocoded via ORS: "${address}"`);
            console.log(`   → ${orsResult.placeName}`);
            console.log(`   📍 (${orsResult.lat.toFixed(4)}, ${orsResult.lng.toFixed(4)})`);
            return orsResult;
        }
        console.log(`⚠️ ORS: no valid result for full address`);
    } catch (error) {
        console.log(`⚠️ ORS geocoding failed: ${error.message}`);
    }

    // Step 3: Simplify the address and retry
    const simplified = simplifyAddress(address);
    if (simplified !== address && simplified.length > 5) {
        console.log(`🔄 Retrying with simplified address: "${simplified}"`);

        // Retry Nominatim with simplified address
        try {
            const nominatimResult = await geocodeWithNominatim(simplified);
            if (nominatimResult) {
                console.log(`✅ Geocoded via Nominatim (simplified): "${simplified}"`);
                console.log(`   → ${nominatimResult.placeName}`);
                console.log(`   📍 (${nominatimResult.lat.toFixed(4)}, ${nominatimResult.lng.toFixed(4)})`);
                return nominatimResult;
            }
        } catch (error) {
            console.log(`⚠️ Nominatim (simplified) failed: ${error.message}`);
        }

        // Retry ORS with simplified address
        try {
            const orsResult = await geocodeWithORS(simplified);
            if (orsResult) {
                console.log(`✅ Geocoded via ORS (simplified): "${simplified}"`);
                console.log(`   → ${orsResult.placeName}`);
                console.log(`   📍 (${orsResult.lat.toFixed(4)}, ${orsResult.lng.toFixed(4)})`);
                return orsResult;
            }
        } catch (error) {
            console.log(`⚠️ ORS (simplified) failed: ${error.message}`);
        }
    }

    // All attempts failed — throw a clear error
    throw new Error(
        `Could not find the exact location: "${address}". ` +
        `Please enter a valid and complete address with the city and state name ` +
        `(e.g., "Connaught Place, New Delhi, Delhi" or "MG Road, Bangalore, Karnataka").`
    );
}

/**
 * Haversine Formula - Calculate straight-line distance between two points
 * Used as fallback when routing API fails but geocoding works
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Multiply by 1.3 to approximate road distance (roads are ~30% longer than straight line)
    const roadDistanceApprox = distance * 1.3;
    
    console.log(`📍 Haversine Distance: ${roadDistanceApprox.toFixed(2)} km (approx road)`);
    return roadDistanceApprox;
}

/**
 * Pure Haversine Formula - Returns straight-line distance WITHOUT road multiplier
 * Used for ML predictions to match training data (trained on pure Haversine)
 */
function pureHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Pure straight-line distance, no multiplier
}

function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Main function to calculate distance between two addresses
 * 
 * @param {string} pickupAddress - Pickup location address
 * @param {string} deliveryAddress - Delivery location address
 * @returns {Promise<Object>} - Distance info including road distance, haversine distance, and coordinates
 */
async function calculateDistance(pickupAddress, deliveryAddress) {
    console.log(`\n🚚 Calculating distance:`);
    console.log(`   From: ${pickupAddress}`);
    console.log(`   To: ${deliveryAddress}`);
    
    // Step 1: Geocode both addresses using ORS API
    let pickupCoords, deliveryCoords;
    
    try {
        pickupCoords = await geocodeAddress(pickupAddress);
    } catch (error) {
        throw new Error(`Pickup location error: ${error.message}`);
    }
    
    try {
        deliveryCoords = await geocodeAddress(deliveryAddress);
    } catch (error) {
        throw new Error(`Delivery location error: ${error.message}`);
    }
    
    // Calculate pure Haversine distance (for ML predictions - matches training data)
    const haversineDistForML = pureHaversineDistance(
        pickupCoords.lat, pickupCoords.lng,
        deliveryCoords.lat, deliveryCoords.lng
    );
    console.log(`📍 Pure Haversine (for ML): ${haversineDistForML.toFixed(2)} km`);
    
    // Step 2: Try OpenRouteService API for road distance (for display to user)
    try {
        const distance = await getDistanceFromORS(pickupCoords, deliveryCoords);
        return {
            distance: Math.round(distance),
            method: 'openrouteservice',
            haversineDistance: haversineDistForML,
            pickupCoords,
            deliveryCoords
        };
    } catch (error) {
        console.log('⚠️ Falling back to Haversine formula...');
    }
    
    // Step 3: Fallback to Haversine formula (with 1.3x for road approximation)
    try {
        const distance = haversineDistance(
            pickupCoords.lat, pickupCoords.lng,
            deliveryCoords.lat, deliveryCoords.lng
        );
        return {
            distance: Math.round(distance),
            method: 'haversine',
            haversineDistance: haversineDistForML,
            pickupCoords,
            deliveryCoords
        };
    } catch (error) {
        throw new Error('Failed to calculate distance. Please try again.');
    }
}

/**
 * Calculate price based on weight and distance
 */
function calculatePrice(weight, distance) {
    const baseCharge = 50;       // Base charge in INR
    const perKmCharge = 0.9;     // Per kilometer charge
    const perKgCharge = 12;      // Per kilogram charge
    
    const price = baseCharge + (distance * perKmCharge) + (weight * perKgCharge);
    return Math.round(price);
}

module.exports = {
    calculateDistance,
    calculatePrice,
    haversineDistance,
    pureHaversineDistance,
    geocodeAddress
};
