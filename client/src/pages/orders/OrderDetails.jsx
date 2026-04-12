import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAdjustedETA } from "../../utils/etaHelper";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faEdit, faTrash, faHistory, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./Orders.css";

const pickupIcon = new L.DivIcon({
    className: "map-marker-custom",
    html: `<div class="map-pin pickup-pin"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#6c5ce7"/><circle cx="12" cy="9" r="3" fill="white"/></svg></div>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36]
});

const deliveryIcon = new L.DivIcon({
    className: "map-marker-custom",
    html: `<div class="map-pin delivery-pin"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#00cec9"/><circle cx="12" cy="9" r="3" fill="white"/></svg></div>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36]
});

const ALL_STATUSES = ["Pending", "Confirmed", "Picked Up", "In Transit", "Out for Delivery", "Delivered"];

function getStatusIndex(status) {
    if (status === "Cancelled") return -1;
    return ALL_STATUSES.indexOf(status);
}

function StatusTimeline({ currentStatus, statusHistory }) {
    const currentIdx = getStatusIndex(currentStatus);
    const isCancelled = currentStatus === "Cancelled";

    const getTimestamp = (status) => {
        const entry = statusHistory?.find(h => h.status === status);
        return entry ? new Date(entry.timestamp).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }) : null;
    };

    return (
        <div className="timeline-container">
            <div className="timeline-track">
                <div
                    className={`timeline-progress ${isCancelled ? 'cancelled' : ''}`}
                    style={{
                        width: isCancelled
                            ? '0%'
                            : `${(currentIdx / (ALL_STATUSES.length - 1)) * 100}%`
                    }}
                />
            </div>
            <div className="timeline-steps">
                {ALL_STATUSES.map((status, idx) => {
                    const isCompleted = !isCancelled && idx <= currentIdx;
                    const isCurrent = !isCancelled && idx === currentIdx;
                    const timestamp = getTimestamp(status);
                    return (
                        <div
                            key={status}
                            className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                        >
                            <div className="timeline-dot">
                                {isCompleted && (
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <span className="timeline-label">{status}</span>
                            {timestamp && (
                                <span className="timeline-time">{timestamp}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            {isCancelled && (
                <div className="timeline-cancelled">
                    <span className="status-pill cancelled" style={{ fontSize: '0.8rem' }}>
                        Order Cancelled
                    </span>
                </div>
            )}
        </div>
    );
}

function OrderMap({ pickupCoords, deliveryCoords, pickupAddress, deliveryAddress }) {
    if (!pickupCoords?.lat || !deliveryCoords?.lat) return null;

    const pickupPos = [pickupCoords.lat, pickupCoords.lng];
    const deliveryPos = [deliveryCoords.lat, deliveryCoords.lng];

    const centerLat = (pickupCoords.lat + deliveryCoords.lat) / 2;
    const centerLng = (pickupCoords.lng + deliveryCoords.lng) / 2;

    const latDiff = Math.abs(pickupCoords.lat - deliveryCoords.lat);
    const lngDiff = Math.abs(pickupCoords.lng - deliveryCoords.lng);
    const maxDiff = Math.max(latDiff, lngDiff);
    let zoom = 12;
    if (maxDiff > 5) zoom = 6;
    else if (maxDiff > 2) zoom = 7;
    else if (maxDiff > 1) zoom = 8;
    else if (maxDiff > 0.5) zoom = 9;
    else if (maxDiff > 0.2) zoom = 10;
    else if (maxDiff > 0.1) zoom = 11;

    return (
        <div className="order-map-card">
            <div className="order-map-header">
                <FontAwesomeIcon icon={faMapMarkerAlt} />
                Route Map
            </div>
            <div className="order-map-wrapper">
                <MapContainer
                    center={[centerLat, centerLng]}
                    zoom={zoom}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}
                    attributionControl={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    />
                    <Marker position={pickupPos} icon={pickupIcon}>
                        <Popup>
                            <div style={{ color: '#333', fontWeight: 500 }}>
                                <strong style={{ color: '#6c5ce7' }}>📦 Pickup</strong><br />
                                {pickupAddress}
                            </div>
                        </Popup>
                    </Marker>
                    <Marker position={deliveryPos} icon={deliveryIcon}>
                        <Popup>
                            <div style={{ color: '#333', fontWeight: 500 }}>
                                <strong style={{ color: '#00cec9' }}>📍 Delivery</strong><br />
                                {deliveryAddress}
                            </div>
                        </Popup>
                    </Marker>
                    <Polyline
                        positions={[pickupPos, deliveryPos]}
                        pathOptions={{
                            color: '#6c5ce7',
                            weight: 3,
                            opacity: 0.7,
                            dashArray: '10, 8'
                        }}
                    />
                </MapContainer>
            </div>
            <div className="order-map-legend">
                <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#6c5ce7' }}></span>
                    Pickup: {pickupAddress}
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#00cec9' }}></span>
                    Delivery: {deliveryAddress}
                </div>
            </div>
        </div>
    );
}

export default function OrderDetails() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();
    const { authFetch, user } = useAuth();

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await authFetch(`/orders/${id}`);
            const data = await res.json();

            if (res.ok) {
                setOrder(data.order);
            } else {
                toast.error(data.message || "Failed to fetch order");
                navigate("/orders");
            }
        } catch (err) {
            console.error("Error fetching order:", err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this order?")) {
            return;
        }

        try {
            setDeleting(true);
            const res = await authFetch(`/orders/${id}`, { method: "DELETE" });
            const data = await res.json();

            if (res.ok) {
                toast.success("Order deleted successfully!");
                navigate("/orders");
            } else {
                toast.error(data.message || "Failed to delete order");
            }
        } catch (err) {
            console.error("Error deleting order:", err);
            toast.error(err.message);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="orders-loading">
                <div className="loading-spinner"></div>
                <p>Loading order details...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="alert alert-danger">
                Order not found
            </div>
        );
    }

    const eta = getAdjustedETA(order.etaMinutes, order.status);
    const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="order-form-container" style={{ maxWidth: '900px' }}>
            <div className="order-form-header">
                <h3>Order Details</h3>
                <Link to="/orders" className="btn btn-outline-secondary">
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Back to Orders
                </Link>
            </div>

            {/* status timeline */}
            <StatusTimeline
                currentStatus={order.status}
                statusHistory={order.statusHistory}
            />

            <div className="order-detail-card">
                <div className="order-detail-header">
                    <div className="order-detail-route">
                        <div className="route-visual">
                            <div className="dot-from"></div>
                            <div className="route-arrow"></div>
                            <div className="dot-to"></div>
                        </div>
                        <div className="order-detail-names">
                            <h3>{order.senderName} → {order.receiverName}</h3>
                        </div>
                    </div>
                    <span className={`status-pill ${statusClass}`} style={{ fontSize: '0.85rem' }}>
                        {order.status}
                    </span>
                </div>

                <div className="order-detail-body">
                    <div className="detail-grid">
                        <div className="detail-item">
                            <span className="detail-item-label">Price</span>
                            <span className="detail-item-value price">
                                &#8377;{order.price?.toLocaleString("en-IN")}
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-item-label">Weight</span>
                            <span className="detail-item-value">{order.weight} kg</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-item-label">Distance</span>
                            <span className="detail-item-value">{order.distance} km</span>
                        </div>

                        {eta ? (
                            <div className="detail-item">
                                <span className="detail-item-label">{eta.label}</span>
                                <span className="detail-item-value">{eta.formatted}</span>
                            </div>
                        ) : order.status === "Delivered" ? (
                            <div className="detail-item">
                                <span className="detail-item-label">Status</span>
                                <span className="detail-item-value" style={{ color: '#34d399' }}>
                                    Delivered ✅
                                </span>
                            </div>
                        ) : null}

                        {order.estimatedDeliveryTime && order.status !== "Delivered" && order.status !== "Cancelled" && (
                            <div className="detail-item">
                                <span className="detail-item-label">Expected By</span>
                                <span className="detail-item-value">
                                    {new Date(order.estimatedDeliveryTime).toLocaleString()}
                                </span>
                            </div>
                        )}

                        {order.riskScore !== undefined && order.riskScore !== null && (
                            <div className="detail-item">
                                <span className="detail-item-label">Fraud Risk</span>
                                <span className="detail-item-value">
                                    {(() => {
                                        const score = order.riskScore;
                                        const level = score >= 0.6 ? 'high' : score >= 0.3 ? 'medium' : 'low';
                                        const icon = level === 'high' ? '🔴' : level === 'medium' ? '🟡' : '🟢';
                                        return (
                                            <>
                                                <span className={`status-pill ${level === 'high' ? 'cancelled' : level === 'medium' ? 'pending' : 'delivered'}`}>
                                                    {icon} {level.toUpperCase()} ({(score * 100).toFixed(0)}%)
                                                </span>
                                                {order.fraudFlags?.length > 0 && (
                                                    <ul className="fraud-flags">
                                                        {order.fraudFlags.map((flag, i) => (
                                                            <li key={i}>⚠️ {flag}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </>
                                        );
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="detail-grid" style={{ marginTop: '1rem' }}>
                        <div className="detail-item">
                            <span className="detail-item-label">Pickup Address</span>
                            <span className="detail-item-value">{order.pickupAddress}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-item-label">Delivery Address</span>
                            <span className="detail-item-value">{order.deliveryAddress}</span>
                        </div>
                        {order.user && (
                            <div className="detail-item">
                                <span className="detail-item-label">Created By</span>
                                <span className="detail-item-value">
                                    {order.user.name} ({order.user.email})
                                </span>
                            </div>
                        )}
                        {order.courier && (
                            <div className="detail-item">
                                <span className="detail-item-label">Courier</span>
                                <span className="detail-item-value">{order.courier.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {(order.status === "Pending" || user?.role === "admin") && (
                    <div className="order-detail-actions">
                        <Link to={`/orders/${id}/edit`} className="btn btn-primary">
                            <FontAwesomeIcon icon={faEdit} className="me-2" />
                            Edit Order
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="btn btn-danger"
                            disabled={deleting}
                        >
                            <FontAwesomeIcon icon={faTrash} className="me-2" />
                            {deleting ? "Deleting..." : "Delete Order"}
                        </button>
                    </div>
                )}
            </div>

            {/* route map */}
            <OrderMap
                pickupCoords={order.pickupCoordinates}
                deliveryCoords={order.deliveryCoordinates}
                pickupAddress={order.pickupAddress}
                deliveryAddress={order.deliveryAddress}
            />

            {/* status history */}
            {order.statusHistory && order.statusHistory.length > 0 && (
                <div className="status-history-card">
                    <div className="status-history-header">
                        <FontAwesomeIcon icon={faHistory} />
                        Status History
                    </div>
                    <ul className="status-history-list">
                        {order.statusHistory.map((history, index) => {
                            const historyStatusClass = history.status.toLowerCase().replace(/\s+/g, '-');
                            return (
                                <li key={index} className="status-history-item">
                                    <span>
                                        <span className={`status-pill ${historyStatusClass}`}>
                                            {history.status}
                                        </span>
                                        {history.note && (
                                            <span className="note">{history.note}</span>
                                        )}
                                    </span>
                                    <span className="timestamp">
                                        {new Date(history.timestamp).toLocaleString()}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
