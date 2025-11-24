const calculateDistance = (pickupAddress, deliveryAddress) => {
    return Math.floor(Math.random() * 1720) + 80;
}
const calculatePrice = (weight, distance) => {
    const baseCharge = 50;
    const perKmCharge = 0.9;
    const perKgCharge = 12;
    return Math.round(baseCharge + (distance * perKmCharge) + (weight * perKgCharge));
}

module.exports = {calculateDistance, calculatePrice};