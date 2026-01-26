import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruckMoving, faUser, faSignOutAlt, faTachometerAlt } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import "./Navbar.css";

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        toast.success("Logged out successfully!");
        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-md bg-body-light border-bottom sticky-top">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/">
                    <FontAwesomeIcon icon={faTruckMoving} className="truck-icon" />
                    <span className="ms-2 fw-bold">Neo-CNS</span>
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
                    <div className="navbar-nav me-auto">
                        {isAuthenticated && (
                            <>
                                <Link className="nav-link" to="/orders">All Orders</Link>
                                <Link className="nav-link" to="/orders/new">Add New Order</Link>
                                {user?.role === "admin" && (
                                    <>
                                        <div className="nav-item dropdown">
                                            <span
                                                className="nav-link dropdown-toggle"
                                                role="button"
                                                data-bs-toggle="dropdown"
                                            >
                                                <FontAwesomeIcon icon={faTachometerAlt} className="me-1" />
                                                Admin
                                            </span>
                                            <ul className="dropdown-menu">
                                                <li>
                                                    <Link className="dropdown-item" to="/admin">
                                                        Dashboard
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link className="dropdown-item" to="/admin/users">
                                                        Manage Users
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link className="dropdown-item" to="/admin/orders">
                                                        Manage Orders
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                    <div className="navbar-nav">
                        {isAuthenticated ? (
                            <>
                                <span className="nav-link text-muted">
                                    <FontAwesomeIcon icon={faUser} className="me-1" />
                                    {user?.name}
                                    <span className={`badge ms-1 ${user?.role === 'admin' ? 'bg-danger' :
                                            user?.role === 'courier' ? 'bg-warning text-dark' : 'bg-secondary'
                                        }`}>{user?.role}</span>
                                </span>
                                <button className="nav-link btn btn-link" onClick={handleLogout}>
                                    <FontAwesomeIcon icon={faSignOutAlt} className="me-1" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link className="nav-link" to="/login">Login</Link>
                                <Link className="nav-link" to="/register">Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}