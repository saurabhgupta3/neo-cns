import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getAdjustedETA } from "../../utils/etaHelper";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBox, faSearch, faTruck, faEye } from "@fortawesome/free-solid-svg-icons";
import "./Admin.css";

export default function OrderManagement() {
    const { authFetch } = useAuth();
    const [orders, setOrders] = useState([]);
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [fraudFilter, setFraudFilter] = useState("");
    const [assignModal, setAssignModal] = useState({ show: false, order: null });
    const [statusModal, setStatusModal] = useState({ show: false, order: null });
    const [selectedCourier, setSelectedCourier] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [statusNote, setStatusNote] = useState("");

    const statuses = ["Pending", "Confirmed", "Picked Up", "In Transit", "Out for Delivery", "Delivered", "Cancelled"];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // fetch orders
            const ordersRes = await authFetch("/orders");
            const ordersData = await ordersRes.json();
            if (ordersRes.ok) {
                setOrders(ordersData.orders || []);
            }

            // fetch couriers
            const couriersRes = await authFetch("/users/couriers");
            const couriersData = await couriersRes.json();
            if (couriersRes.ok) {
                setCouriers(couriersData.couriers || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignCourier = async (e) => {
        e.preventDefault();
        if (!selectedCourier) {
            toast.error("Please select a courier");
            return;
        }

        try {
            const res = await authFetch(`/orders/${assignModal.order._id}/assign`, {
                method: "PUT",
                body: { courierId: selectedCourier }
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Courier assigned successfully");
                setOrders(orders.map(o => o._id === assignModal.order._id ? data.order : o));
                setAssignModal({ show: false, order: null });
                setSelectedCourier("");
            } else {
                toast.error(data.message || "Failed to assign courier");
            }
        } catch (error) {
            toast.error("Error assigning courier");
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (!selectedStatus) {
            toast.error("Please select a status");
            return;
        }

        try {
            const res = await authFetch(`/orders/${statusModal.order._id}/status`, {
                method: "PUT",
                body: { status: selectedStatus, note: statusNote }
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(`Status updated to ${selectedStatus}`);
                setOrders(orders.map(o => o._id === statusModal.order._id ? data.order : o));
                setStatusModal({ show: false, order: null });
                setSelectedStatus("");
                setStatusNote("");
            } else {
                toast.error(data.message || "Failed to update status");
            }
        } catch (error) {
            toast.error("Error updating status");
        }
    };

    // filter orders
    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.senderName?.toLowerCase().includes(search.toLowerCase()) ||
            order.receiverName?.toLowerCase().includes(search.toLowerCase()) ||
            order.pickupAddress?.toLowerCase().includes(search.toLowerCase()) ||
            order.deliveryAddress?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || order.status === statusFilter;
        const matchesFraud =
            fraudFilter !== "review" || order.fraudReviewRequired === true;
        return matchesSearch && matchesStatus && matchesFraud;
    });

    if (loading) {
        return (
            <div className="admin-container admin-loading-state text-center py-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <header className="admin-page-head">
                <div>
                    <h1>
                        <FontAwesomeIcon icon={faBox} className="me-2" aria-hidden />
                        Order management
                    </h1>
                    <p className="admin-subtitle">Search, assign couriers, and update shipment status</p>
                </div>
            </header>

            {/* Search and Filter */}
            <div className="admin-search">
                <div className="position-relative flex-grow-1">
                    <FontAwesomeIcon icon={faSearch} className="admin-search-icon" aria-hidden />
                    <input
                        type="text"
                        className="admin-search-input w-100"
                        placeholder="Search by sender, receiver, or address…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
                <select value={fraudFilter} onChange={(e) => setFraudFilter(e.target.value)}>
                    <option value="">All orders</option>
                    <option value="review">Needs fraud review</option>
                </select>
            </div>

            {/* Orders Table */}
            <div className="admin-card">
                <div className="admin-card-body admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Parties</th>
                                <th>Addresses</th>
                                <th>Status</th>
                                <th>ETA</th>
                                <th>Risk</th>
                                <th>Price</th>
                                <th>Courier</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted py-4">
                                        No orders found
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => (
                                    <tr key={order._id}>
                                        <td>
                                            <div className="admin-party-stack">
                                                <div className="admin-party-row">
                                                    <span className="admin-party-label">From</span>
                                                    <span className="admin-party-value">{order.senderName}</span>
                                                </div>
                                                <div className="admin-party-row">
                                                    <span className="admin-party-label">To</span>
                                                    <span className="admin-party-value">{order.receiverName}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="admin-party-stack admin-address-block">
                                                <div className="admin-party-row">
                                                    <span className="admin-party-label">Pickup</span>
                                                    <span className="admin-party-value" title={order.pickupAddress}>
                                                        {order.pickupAddress
                                                            ? (order.pickupAddress.length > 48
                                                                ? `${order.pickupAddress.slice(0, 48)}…`
                                                                : order.pickupAddress)
                                                            : "—"}
                                                    </span>
                                                </div>
                                                <div className="admin-party-row">
                                                    <span className="admin-party-label">Delivery</span>
                                                    <span className="admin-party-value" title={order.deliveryAddress}>
                                                        {order.deliveryAddress
                                                            ? (order.deliveryAddress.length > 48
                                                                ? `${order.deliveryAddress.slice(0, 48)}…`
                                                                : order.deliveryAddress)
                                                            : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${order.status.toLowerCase().replace(' ', '-')}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td>
                                            {(() => {
                                                const eta = getAdjustedETA(order.etaMinutes, order.status);
                                                if (order.status === "Delivered") return <span className="admin-text-done">Delivered</span>;
                                                if (order.status === "Cancelled") return <span className="admin-text-muted">—</span>;
                                                return eta ? (
                                                    <span title={eta.label}>
                                                        {eta.formatted}
                                                        <br />
                                                        <span className="admin-eta-sub">{eta.label}</span>
                                                    </span>
                                                ) : (
                                                    <span className="admin-text-muted">—</span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            {(() => {
                                                const score = order.riskScore || 0;
                                                const level = score >= 0.6 ? "high" : score >= 0.3 ? "medium" : "low";
                                                return (
                                                    <div>
                                                        <span
                                                            className={`risk-pill risk-pill--${level}`}
                                                            title={order.fraudFlags?.length ? order.fraudFlags.join(", ") : "No flags"}
                                                        >
                                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                                        </span>
                                                        {order.fraudReviewRequired && (
                                                            <span className="admin-fraud-review-flag" title="Flagged for admin review">
                                                                Review
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td>₹{order.price?.toLocaleString()}</td>
                                        <td>
                                            {order.courier ? (
                                                <span className="admin-courier-name">
                                                    <FontAwesomeIcon icon={faTruck} className="me-1" aria-hidden />
                                                    {order.courier.name}
                                                </span>
                                            ) : (
                                                <span className="admin-text-muted">Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <Link to={`/orders/${order._id}`} className="action-btn edit">
                                                <FontAwesomeIcon icon={faEye} />
                                            </Link>
                                            <button
                                                className="action-btn assign"
                                                onClick={() => {
                                                    setAssignModal({ show: true, order });
                                                    setSelectedCourier(order.courier?._id || "");
                                                }}
                                                title="Assign Courier"
                                            >
                                                <FontAwesomeIcon icon={faTruck} />
                                            </button>
                                            <button
                                                className="action-btn edit"
                                                onClick={() => {
                                                    setStatusModal({ show: true, order });
                                                    setSelectedStatus(order.status);
                                                }}
                                                title="Update Status"
                                            >
                                                Status
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assign Courier Modal */}
            {assignModal.show && (
                <div className="modal-overlay" onClick={() => setAssignModal({ show: false, order: null })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Assign Courier</h4>
                            <button className="modal-close" onClick={() => setAssignModal({ show: false, order: null })}>
                                &times;
                            </button>
                        </div>
                        <div className="modal-party-summary">
                            <div className="admin-party-stack">
                                <div className="admin-party-row">
                                    <span className="admin-party-label">From</span>
                                    <span className="admin-party-value">{assignModal.order?.senderName}</span>
                                </div>
                                <div className="admin-party-row">
                                    <span className="admin-party-label">To</span>
                                    <span className="admin-party-value">{assignModal.order?.receiverName}</span>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleAssignCourier}>
                            <div className="mb-3">
                                <label className="form-label">Select Courier</label>
                                <select
                                    className="form-control"
                                    value={selectedCourier}
                                    onChange={(e) => setSelectedCourier(e.target.value)}
                                    required
                                >
                                    <option value="">-- Select Courier --</option>
                                    {couriers.map(courier => (
                                        <option key={courier._id} value={courier._id}>
                                            {courier.name} ({courier.phone || 'No phone'})
                                        </option>
                                    ))}
                                </select>
                                {couriers.length === 0 && (
                                    <small className="text-muted">No available couriers. Create a courier user first.</small>
                                )}
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-primary flex-grow-1" disabled={couriers.length === 0}>
                                    Assign Courier
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setAssignModal({ show: false, order: null })}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update Status Modal */}
            {statusModal.show && (
                <div className="modal-overlay" onClick={() => setStatusModal({ show: false, order: null })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h4>Update Order Status</h4>
                            <button className="modal-close" onClick={() => setStatusModal({ show: false, order: null })}>
                                &times;
                            </button>
                        </div>
                        <div className="modal-party-summary">
                            <div className="admin-party-stack">
                                <div className="admin-party-row">
                                    <span className="admin-party-label">From</span>
                                    <span className="admin-party-value">{statusModal.order?.senderName}</span>
                                </div>
                                <div className="admin-party-row">
                                    <span className="admin-party-label">To</span>
                                    <span className="admin-party-value">{statusModal.order?.receiverName}</span>
                                </div>
                            </div>
                        </div>
                        <form onSubmit={handleUpdateStatus}>
                            <div className="mb-3">
                                <label className="form-label">New Status</label>
                                <select
                                    className="form-control"
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    required
                                >
                                    {statuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Note (optional)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Add a note for this status update"
                                    value={statusNote}
                                    onChange={(e) => setStatusNote(e.target.value)}
                                />
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn btn-primary flex-grow-1">
                                    Update Status
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setStatusModal({ show: false, order: null })}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
