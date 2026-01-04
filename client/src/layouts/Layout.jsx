import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function Layout() {
    return (
        <>
            <Navbar></Navbar>
            <h1>Courier Network System</h1>
            <hr />
            <Outlet></Outlet>
        </>
    )
}