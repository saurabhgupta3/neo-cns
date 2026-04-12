import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import { getAdjustedETA } from "../../utils/etaHelper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faBoxOpen, faClock } from "@fortawesome/free-solid-svg-icons";
import "./Orders.css";

export default function OrdersList() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const { authFetch, user } = useAuth();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await authFetch("/orders");
            const data = await res.json();

            if (res.ok) {
                setOrders(data.orders || []);
            } else {
                setError(data.message || "Failed to fetch orders");
            }
        } catch (err) {
            console.error("Error fetching orders:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="orders-loading">
                <div className="loading-spinner"></div>
                <p>Loading orders...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="content">
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="orders-page-header">
                <h2>{user?.role === "courier" ? "My Assigned Orders" : "All Orders"}</h2>
                {user?.role !== "courier" && (
                    <Link to="/orders/new" className="btn btn-primary orders-btn-primary">
                        <FontAwesomeIcon icon={faPlus} className="me-2" aria-hidden />
                        New Order
                    </Link>
                )}
            </div>

            {orders.length === 0 ? (
                <div className="orders-empty">
                    <div className="orders-empty-icon">
                        <FontAwesomeIcon icon={faBoxOpen} />
                    </div>
                    <h4>
                        {user?.role === "courier"
                            ? "No orders assigned to you yet"
                            : "No orders found"}
                    </h4>
                    <p>
                        {user?.role === "courier"
                            ? "Check back later for new delivery assignments."
                            : "Create your first order to get started."}
                    </p>
                    {user?.role !== "courier" && (
                        <Link to="/orders/new" className="btn btn-primary orders-btn-primary">
                            <FontAwesomeIcon icon={faPlus} className="me-2" aria-hidden />
                            Create Order
                        </Link>
                    )}
                </div>
            ) : (
                <div className="orders-grid">
                    {orders.map((order) => {
                        const eta = getAdjustedETA(order.etaMinutes, order.status);
                        const statusClass = order.status.toLowerCase().replace(/\s+/g, '-');
                        return (
                            <Link to={`/orders/${order._id}`} key={order._id} className="order-show-link">
                                <div className="order-card">
                                    <div className="order-card-header">
                                        <div className="order-party-block">
                                            <div className="order-party-row">
                                                <span className="order-party-label">From</span>
                                                <span className="order-party-value">{order.senderName}</span>
                                            </div>
                                            <div className="order-party-row">
                                                <span className="order-party-label">To</span>
                                                <span className="order-party-value">{order.receiverName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="order-card-meta">
                                        <span className={`status-pill ${statusClass}`}>
                                            {order.status}
                                        </span>
                                        {eta && (
                                            <span className="eta-badge" title={eta.label}>
                                                <FontAwesomeIcon icon={faClock} className="eta-badge-icon" aria-hidden />
                                                {eta.formatted}
                                            </span>
                                        )}
                                    </div>

                                    <div className="order-card-footer">
                                        <span className="order-price">
                                            &#8377;{order.price?.toLocaleString("en-IN")}
                                        </span>
                                        {order.distance && (
                                            <span className="order-distance">
                                                {order.distance} km
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
