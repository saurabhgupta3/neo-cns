import { Outlet } from "react-router-dom";

export default function Layout() {
    return (
        <>
            <h1>Courier Network System</h1>
            <hr />
            <Outlet></Outlet>
        </>
    )
}