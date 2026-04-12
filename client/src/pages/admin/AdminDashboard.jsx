import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faBox, faTruck, faClock, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import "./Admin.css";

export default function AdminDashboard() {
    const { authFetch } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalOrders: 0,
        totalCouriers: 0,
        pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // fetch orders
            const ordersRes = await authFetch("/orders");
            const ordersData = await ordersRes.json();
            const orders = ordersData.orders || [];

            // fetch users
            const usersRes = await authFetch("/users");
            const usersData = await usersRes.json();
            const users = usersData.users || [];

            // calc stats
            const couriers = users.filter(u => u.role === "courier");
            const pendingOrders = orders.filter(o => o.status === "Pending");

            setStats({
                totalUsers: users.length,
                totalOrders: orders.length,
                totalCouriers: couriers.length,
                pendingOrders: pendingOrders.length
            });

            // recent items
            setRecentOrders(orders.slice(0, 5));
            setRecentUsers(users.slice(0, 5));

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

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
                    <h1>Admin Dashboard</h1>
                    <p className="admin-subtitle">Overview of users, orders, and operations</p>
                </div>
                <div className="quick-actions">
                    <Link to="/admin/users" className="quick-action-btn primary">
                        <FontAwesomeIcon icon={faUsers} /> Manage users
                    </Link>
                    <Link to="/admin/orders" className="quick-action-btn secondary">
                        <FontAwesomeIcon icon={faBox} /> Manage orders
                    </Link>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon users">
                        <FontAwesomeIcon icon={faUsers} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.totalUsers}</h3>
                        <p>Total Users</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orders">
                        <FontAwesomeIcon icon={faBox} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.totalOrders}</h3>
                        <p>Total Orders</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon couriers">
                        <FontAwesomeIcon icon={faTruck} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.totalCouriers}</h3>
                        <p>Active Couriers</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon pending">
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats.pendingOrders}</h3>
                        <p>Pending Orders</p>
                    </div>
                </div>
            </div>

            {/* Recent Data */}
            <div className="row">
                {/* Recent Orders */}
                <div className="col-lg-6">
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <h5>Recent orders</h5>
                            <Link to="/admin/orders" className="admin-card-link">
                                View all <FontAwesomeIcon icon={faArrowRight} />
                            </Link>
                        </div>
                        <div className="admin-card-body">
                            {recentOrders.length === 0 ? (
                                <p className="text-muted text-center">No orders yet</p>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Parties</th>
                                            <th>Status</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.map(order => (
                                            <tr key={order._id}>
                                                <td>
                                                    <Link to={`/orders/${order._id}`} className="admin-order-parties-link">
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
                                                    </Link>
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${order.status.toLowerCase().replace(' ', '-')}`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td>₹{order.price?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Users */}
                <div className="col-lg-6">
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <h5>Recent users</h5>
                            <Link to="/admin/users" className="admin-card-link">
                                View all <FontAwesomeIcon icon={faArrowRight} />
                            </Link>
                        </div>
                        <div className="admin-card-body">
                            {recentUsers.length === 0 ? (
                                <p className="text-muted text-center">No users yet</p>
                            ) : (
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentUsers.map(user => (
                                            <tr key={user._id}>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className={`role-badge ${user.role}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
