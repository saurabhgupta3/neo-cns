import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAdjustedETA } from "../../utils/etaHelper";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faEdit, faTrash, faHistory } from "@fortawesome/free-solid-svg-icons";
import "./Orders.css";

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
        <div className="order-form-container">
            <div className="order-form-header">
                <h3>Order Details</h3>
                <Link to="/orders" className="btn btn-outline-secondary">
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Back to Orders
                </Link>
            </div>

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
