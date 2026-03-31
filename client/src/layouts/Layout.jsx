import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Chatbot from "../components/Chatbot";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Layout.css";

export default function Layout() {
    return (
        <div className="page">
            <ToastContainer
                position="top-right"
                autoClose={3000}
                pauseOnHover
                closeOnClick
                theme="dark"
            />
            <Navbar />
            <div className="page-hero">
                <h1>Courier Network System</h1>
            </div>
            <main className="content">
                <Outlet />
            </main>
            <Chatbot />
            <Footer />
        </div>
    )
}