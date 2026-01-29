import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="container text-center py-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h1 className="display-1 text-muted">404</h1>
                    <h2 className="mb-4">Page Not Found</h2>
                    <p className="text-muted mb-4">
                        The page you are looking for does not exist.
                    </p>
                    <Link to="/" className="btn btn-primary">
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
