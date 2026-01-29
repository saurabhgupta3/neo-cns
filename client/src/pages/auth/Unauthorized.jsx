import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Unauthorized() {
    const { user } = useAuth();

    return (
        <div className="container text-center py-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h1 className="display-1 text-danger">403</h1>
                    <h2 className="mb-4">Access Denied</h2>
                    <p className="text-muted mb-4">
                        Sorry, you don't have permission to access this page.
                        {user && (
                            <span> Your current role is <strong>{user.role}</strong>.</span>
                        )}
                    </p>
                    <Link to="/orders" className="btn btn-primary">
                        Go to Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}
