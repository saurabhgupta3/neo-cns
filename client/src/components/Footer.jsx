import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinkedin, faSquareInstagram, faFacebook } from "@fortawesome/free-brands-svg-icons";
import "./Footer.css";

export default function Footer() {
    return (
        <footer>
            <div className="f-info">
                <div className="f-info-socials">
                    <FontAwesomeIcon icon={faLinkedin} />
                    <FontAwesomeIcon icon={faSquareInstagram} />
                    <FontAwesomeIcon icon={faFacebook} />
                </div>
                <div>&copy; NeoCNS Private Limited</div>
                <div className="f-info-links">
                    <Link to="/privacy">Privacy </Link>
                    <Link to="/terms">Terms</Link>
                </div>
            </div>
        </footer>
    )
}