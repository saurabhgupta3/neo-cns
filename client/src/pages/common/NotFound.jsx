import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGhost } from "@fortawesome/free-solid-svg-icons";

export default function NotFound() {
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
                icon={faGhost}
                style={{
                    fontSize: '4rem',
                    marginBottom: '1.5rem',
                    color: 'var(--text-muted)',
                    opacity: 0.5
                }}
            />
            <h1 style={{
                fontSize: '5rem',
                fontWeight: 800,
                margin: 0,
                background: 'var(--accent-gradient)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
            }}>
                404
            </h1>
            <h2 style={{
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                fontWeight: 600
            }}>
                Page Not Found
            </h2>
            <p style={{
                color: 'var(--text-muted)',
                marginBottom: '2rem',
                maxWidth: '400px'
            }}>
                The page you are looking for does not exist or has been moved.
            </p>
            <Link to="/" className="btn btn-primary">
                Go Home
            </Link>
        </div>
    );
}
