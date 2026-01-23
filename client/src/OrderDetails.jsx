import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { toast } from "react-toastify";
import "./OrderDetails.css";

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
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
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

    return (
        <div className="container py-4">
            <div className="row">
                <div className="col-lg-8 offset-lg-2">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>Order Details</h2>
                        <Link to="/orders" className="btn btn-outline-secondary">
                            ← Back to Orders
                        </Link>
                    </div>

                    <div className="card shadow-sm">
                        <div className="row g-0">
                            <div className="col-md-5">
                                <img
                                    className="img-fluid rounded-start h-100"
                                    src={order.image}
                                    alt="order"
                                    style={{ objectFit: "cover" }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png";
                                    }}
                                />
                            </div>
                            <div className="col-md-7">
                                <div className="card-body">
                                    <h5 className="card-title">
                                        {order.senderName} <span className="text-muted">→</span> {order.receiverName}
                                    </h5>

                                    <span className={`badge ${getStatusColor(order.status)} mb-3`}>
                                        {order.status}
                                    </span>

                                    <table className="table table-borderless">
                                        <tbody>
                                            <tr>
                                                <td><strong>Price:</strong></td>
                                                <td>&#8377;{order.price?.toLocaleString("en-IN")}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Weight:</strong></td>
                                                <td>{order.weight} kg</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Distance:</strong></td>
                                                <td>{order.distance} km</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Pickup:</strong></td>
                                                <td>{order.pickupAddress}</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Delivery:</strong></td>
                                                <td>{order.deliveryAddress}</td>
                                            </tr>
                                            {order.user && (
                                                <tr>
                                                    <td><strong>Created By:</strong></td>
                                                    <td>{order.user.name} ({order.user.email})</td>
                                                </tr>
                                            )}
                                            {order.courier && (
                                                <tr>
                                                    <td><strong>Courier:</strong></td>
                                                    <td>{order.courier.name}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    <div className="d-flex gap-2 mt-3">
                                        {/* Only show edit if order is pending or user is admin */}
                                        {(order.status === "Pending" || user?.role === "admin") && (
                                            <Link to={`/orders/${id}/edit`} className="btn btn-primary">
                                                Edit Order
                                            </Link>
                                        )}

                                        {/* Only show delete if order is pending or user is admin */}
                                        {(order.status === "Pending" || user?.role === "admin") && (
                                            <button
                                                onClick={handleDelete}
                                                className="btn btn-danger"
                                                disabled={deleting}
                                            >
                                                {deleting ? "Deleting..." : "Delete Order"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status History */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                        <div className="card mt-4 shadow-sm">
                            <div className="card-header">
                                <h5 className="mb-0">Status History</h5>
                            </div>
                            <div className="card-body">
                                <ul className="list-group list-group-flush">
                                    {order.statusHistory.map((history, index) => (
                                        <li key={index} className="list-group-item d-flex justify-content-between">
                                            <span>
                                                <span className={`badge ${getStatusColor(history.status)} me-2`}>
                                                    {history.status}
                                                </span>
                                                {history.note}
                                            </span>
                                            <small className="text-muted">
                                                {new Date(history.timestamp).toLocaleString()}
                                            </small>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function getStatusColor(status) {
    const colors = {
        "Pending": "bg-warning text-dark",
        "Confirmed": "bg-info",
        "Picked Up": "bg-primary",
        "In Transit": "bg-primary",
        "Out for Delivery": "bg-info",
        "Delivered": "bg-success",
        "Cancelled": "bg-danger"
    };
    return colors[status] || "bg-secondary";
}