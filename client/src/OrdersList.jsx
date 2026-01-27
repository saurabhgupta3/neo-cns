import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from "./context/AuthContext";
import "./OrdersList.css";

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
      <div className="content text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Loading orders...</p>
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
    <div className="content">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{user?.role === "courier" ? "My Assigned Orders" : "All Orders"}</h2>
        {user?.role !== "courier" && (
          <Link to="/orders/new" className="btn btn-primary">
            + New Order
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">
            {user?.role === "courier"
              ? "No orders assigned to you yet."
              : "No orders found. Create your first order!"}
          </p>
          {user?.role !== "courier" && (
            <Link to="/orders/new" className="btn btn-primary">
              Create Order
            </Link>
          )}
        </div>
      ) : (
        <div className="row row-cols-lg-3 row-cols-md-2 row-cols-sm-1 g-4">
          {orders.map((order) => (
            <Link to={`/orders/${order._id}`} key={order._id} className="order-show-link">
              <div className="card col h-100">
                <img
                  src={order.image}
                  alt="order"
                  className="card-img-top"
                  style={{ height: "20rem", objectFit: "cover" }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://res.cloudinary.com/dfq3xkwrk/image/upload/v1762187021/ChatGPT_Image_Nov_3_2025_09_51_44_PM_ausbho.png";
                  }}
                />
                <div className="card-img-overlay"></div>
                <div className="card-body">
                  <p className="card-text">
                    <b>{order.senderName} <span className="text-muted">→</span> {order.receiverName}</b>
                    <br />
                    <span className={`badge ${getStatusColor(order.status)}`}>{order.status}</span>
                    <br />
                    &#8377;{order.price?.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get status badge color
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
