import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruckMoving } from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";


export default function Navbar() {
    return (
        <>
            <nav className="navbar navbar-expand-md bg-body-light border-bottom sticky-top">
                <div className="container-fluid">
                    <Link className="navbar-brand" to="/"><FontAwesomeIcon icon={faTruckMoving} className="truck-icon"/></Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavAltMarkup">
                    <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNavAltMarkup">
                        <div className="navbar-nav">
                            <Link className="nav-link"  to="/">Home</Link>
                            <Link className="nav-link" to="/orders">All Orders</Link>
                            <Link className="nav-link" to="/orders/new">Add New Order</Link>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    )
}