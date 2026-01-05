import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Layout.css";

export default function Layout() {
    return (
        <div className="page">
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