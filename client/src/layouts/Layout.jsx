import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "./Layout.css";

export default function Layout() {
    return (
        <div className="page">
            <Navbar></Navbar>
            <main className="content">
                <Outlet></Outlet>
            </main>
            <Footer></Footer>
        </div>
    )
}