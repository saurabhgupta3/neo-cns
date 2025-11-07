import { useEffect, useState } from "react";

export default function OrdersList() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/orders") // 👈 your backend endpoint
      .then((res) => res.json())
      .then((data) => setOrders(data))
      .catch((err) => console.error("Error fetching orders:", err));
  }, []);

  return (
    <div>
      <h2>📦 All Orders</h2>
      <ul>
        {orders.map((order) => (
          <li key={order._id}>
            {order.senderName} → {order.receiverName} ({order.status})
          </li>
        ))}
      </ul>
    </div>
  );
}
