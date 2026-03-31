import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldAlt } from "@fortawesome/free-solid-svg-icons";

export default function Unauthorized() {
    const { user } = useAuth();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            minHeight: '50vh'
        }}>
            <FontAwesomeIcon
                icon={faShieldAlt}
                style={{
                    fontSize: '4rem',
                    marginBottom: '1.5rem',
                    color: '#f87171',
                    opacity: 0.7
                }}
            />
            <h1 style={{
                fontSize: '5rem',
                fontWeight: 800,
                margin: 0,
                color: '#f87171'
            }}>
                403
            </h1>
            <h2 style={{
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                fontWeight: 600
            }}>
                Access Denied
            </h2>
            <p style={{
                color: 'var(--text-muted)',
                marginBottom: '2rem',
                maxWidth: '400px'
            }}>
                Sorry, you don't have permission to access this page.
                {user && (
                    <span> Your current role is <strong style={{ color: 'var(--accent-primary-light)' }}>{user.role}</strong>.</span>
                )}
            </p>
            <Link to="/orders" className="btn btn-primary">
                Go to Orders
            </Link>
        </div>
    );
}
