import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
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
            />
            <Navbar></Navbar>
            <h1>Courier Network System</h1>
            <hr />
            <main className="content">
                <Outlet></Outlet>
            </main>
            
            <Footer></Footer>
        </div>
    )
}